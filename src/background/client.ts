import { Request, ByteBuffer, Response, BodyType, BlockHeader, SigPair, Block, Msg, RpcType } from 'regiusmark';
import { EventEmitter } from 'events';
import { Logger } from '../log';
import { Lock } from '../lock';
import WebSocket from 'ws';

const log = new Logger('main:client');

const MAX_U32 = 0xffff_ffff;
let instance: PersistentClient;

export class DisconnectedError extends Error {
  public constructor(msg = 'disconnected from node') {
    super(msg);
    Object.setPrototypeOf(this, DisconnectedError.prototype);
  }
}

export interface PersistentClient {
  sendReq(body: Request): Promise<Response>;
  getBlockRange(minHeight: Long, maxHeight: Long, cb: GetBlockRangeCallback): void;
  isOpen(): boolean;
  on(event: 'open', listener: () => void): this;
  on(event: 'close', listener: (code: string, reason: string | undefined, retryTime: number) => void): this;
  on(event: 'sub_msg', listener: (res: Response) => void): this;
}

export type GetBlockRangeCallback = (
  err: Error | undefined,
  filteredBlock: [BlockHeader, SigPair] | Block | undefined,
) => void | Promise<void>;

type ResolveReqFn = (res: Response) => void;
type RejectReqFn = (err: Error) => void;

class ClientImpl extends EventEmitter {
  private url: string;
  private socket: WebSocket | undefined;
  private socketMsgHandleLock = new Lock();
  private lastMsgReceived: number = 0;
  private heartbeatTimer: NodeJS.Timer | undefined;
  private connectTimer: NodeJS.Timer | undefined;
  private prevCloseMsg: string | undefined;
  private prevErrorMsg: string | undefined;

  private currentId = 0;
  private inflightReqs: { [reqId: number]: [ResolveReqFn, RejectReqFn] } = {};
  private blockRangeStreams: { [reqId: number]: GetBlockRangeCallback } = {};

  public constructor(url: string) {
    super();
    this.url = url;
    this.tryOpen();
  }

  public sendReq(body: Request): Promise<Response> {
    if (body.type === RpcType.GetBlockRange) {
      throw new Error('cannot use GetBlockRange with sendReq');
    }
    const id = this.nextId();
    const msg = new Msg(id, {
      type: BodyType.Request,
      req: body,
    });
    const buf = ByteBuffer.alloc(4096);
    msg.serialize(buf);
    return new Promise((resolve, reject): void => {
      if (this.socket) {
        this.inflightReqs[id] = [resolve, reject];
        this.socket.send(buf.sharedView(), err => {
          if (err) {
            delete this.inflightReqs[id];
            reject(err);
          }
        });
      } else {
        reject(new DisconnectedError());
      }
    });
  }

  public getBlockRange(minHeight: Long, maxHeight: Long, cb: GetBlockRangeCallback): void {
    const id = this.nextId();
    const req = new Msg(id, {
      type: BodyType.Request,
      req: {
        type: RpcType.GetBlockRange,
        minHeight,
        maxHeight,
      },
    });
    const buf = ByteBuffer.alloc(32);
    req.serialize(buf);
    if (this.socket) {
      this.blockRangeStreams[id] = cb;
      this.socket.send(buf.sharedView(), err => {
        if (err) {
          delete this.blockRangeStreams[id];
          cb(err, undefined);
        }
      });
    } else {
      cb(new DisconnectedError(), undefined);
    }
  }

  private nextId(): number {
    if (this.currentId === MAX_U32) {
      this.currentId = 0;
    }
    return this.currentId++;
  }

  public isOpen(): boolean {
    return this.socket !== undefined && this.socket.readyState === WebSocket.OPEN;
  }

  private tryOpen(): void {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    this.socket = new WebSocket(this.url);

    this.socket.on('open', () => {
      log.info('Connection to blockchain opened on url:', this.url);
      this.connectTimer = undefined;
      this.prevCloseMsg = undefined;
      this.prevErrorMsg = undefined;

      this.lastMsgReceived = Date.now();
      this.heartbeatTimer = setInterval(() => {
        if (Date.now() - this.lastMsgReceived >= 30000) {
          log.error('Connection heartbeat timed out');
          this.socket!.terminate();
        }
      }, 1000 * 10);

      this.emit('open');
    });

    this.socket.on('close', (code, reason) => {
      const msg = 'Connection to blockchain closed (code: ' + code + ', reason: ' + reason + ')';
      if (msg !== this.prevCloseMsg) {
        log.info(msg);
        this.prevCloseMsg = msg;
      }
      this.socket = undefined;
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
      }

      this.currentId = 0;

      for (const req of Object.values(this.inflightReqs)) {
        // Reject any pending requests as they are no longer valid
        req[1](new DisconnectedError());
      }
      this.inflightReqs = {};

      for (const cb of Object.values(this.blockRangeStreams)) {
        cb(new DisconnectedError(), undefined);
      }
      this.blockRangeStreams = {};

      const retryTime = Math.min(1000, Math.floor(15000 * Math.random()));
      this.emit('close', code, reason, retryTime);

      this.connectTimer = setTimeout(() => {
        this.tryOpen();
      }, retryTime);
    });

    this.socket.on('error', err => {
      const msg = 'Connection error: ' + err;
      if (msg !== this.prevErrorMsg) {
        log.error(msg);
        this.prevErrorMsg = msg;
      }
    });

    this.socket.on('message', async data => {
      if (!Buffer.isBuffer(data)) {
        log.error('Unexpected ws message:', data);
        return;
      }

      this.lastMsgReceived = Date.now();
      try {
        // We lock the message handler since we are an async function and messages must be processed in order before
        // continuing.
        await this.socketMsgHandleLock.lock();

        const buf = ByteBuffer.from(data);
        const msg = Msg.deserialize(buf);
        await this.handleMsg(msg);
      } catch (e) {
        log.error('Failed to deserialize response:', e);
      } finally {
        this.socketMsgHandleLock.unlock();
      }
    });
  }

  private async handleMsg(msg: Msg): Promise<void> {
    const id = msg.id;
    switch (msg.body.type) {
      case BodyType.Error: {
        if (id === MAX_U32) {
          log.error('Received IO error:', msg);
          return;
        }

        const streamFn = this.blockRangeStreams[id];
        if (streamFn !== undefined) {
          delete this.blockRangeStreams[id];
          await streamFn(msg.body.error, undefined);
          return;
        }

        const fns = this.inflightReqs[id];
        if (!fns) {
          log.error('Unrecognized response id:', msg);
          return;
        }

        const reject = fns[1];
        delete this.inflightReqs[id];
        reject(msg.body.error);

        return;
      }
      case BodyType.Request:
        log.error('Unexpected request from server:', msg);
        return;
      case BodyType.Response: {
        if (id === MAX_U32) {
          const body = msg.body;
          if (body.type === BodyType.Response && body.res.type === RpcType.GetBlock) {
            this.emit('sub_msg', body.res);
            return;
          }
        }

        {
          const streamFn = this.blockRangeStreams[id];
          if (streamFn !== undefined) {
            const res = msg.body.res;
            if (res.type === RpcType.GetBlock) {
              // Stream update
              await streamFn(undefined, res.block);
            } else if (res.type === RpcType.GetBlockRange) {
              // Stream finalized
              delete this.blockRangeStreams[id];
              await streamFn(undefined, undefined);
            }
            return;
          }
        }

        const fns = this.inflightReqs[id];
        if (!fns) {
          log.error('Unrecognized response id:', msg);
          return;
        }
        const resolve = fns[0];
        delete this.inflightReqs[id];
        resolve(msg.body.res);

        return;
      }
      case BodyType.Ping: {
        const pongMsg = new Msg(id, {
          type: BodyType.Pong,
          nonce: msg.body.nonce,
        });
        const buf = ByteBuffer.alloc(4096);
        pongMsg.serialize(buf);
        if (this.socket) this.socket.send(buf.sharedView());
        return;
      }
      /* fall through */
      case BodyType.Pong: {
        // Last message receive is already updated
        return;
      }
      default:
        const _exhaustiveCheck: never = msg.body;
        throw new Error('exhaustive check failed:' + _exhaustiveCheck);
    }
  }
}

export function initClient(url: string): void {
  if (instance) throw new Error('client already initialized');
  instance = new ClientImpl(url);
}

export function getClient(): PersistentClient {
  return instance!;
}
