import {
  RequestBody,
  Request,
  ByteBuffer,
  Response,
  ResponseBody,
  BodyType,
  ErrorRes,
  NetworkError,
  BlockHeader,
  SigPair,
  Block,
} from 'godcoin';
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

export class RpcError extends Error {
  public readonly err: NetworkError;

  public constructor(err: ErrorRes) {
    super();
    this.err = err.error;
    Object.setPrototypeOf(this, RpcError.prototype);
  }
}

export interface PersistentClient {
  sendReq(body: RequestBody): Promise<ResponseBody>;
  getBlockRange(minHeight: Long, maxHeight: Long, cb: GetBlockRangeCallback): void;
  isOpen(): boolean;
  on(event: 'open', listener: () => void): this;
  on(event: 'close', listener: (code: string, reason: string | undefined, retryTime: number) => void): this;
  on(event: 'sub_msg', listener: (res: ResponseBody) => void): this;
}

export type GetBlockRangeCallback = (
  err: Error | undefined,
  filteredBlock: [BlockHeader, SigPair] | Block | undefined,
) => void | Promise<void>;

type ResolveReqFn = (res: ResponseBody) => void;
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

  public sendReq(body: RequestBody): Promise<ResponseBody> {
    if (body.type === BodyType.GetBlockRange) {
      throw new Error('cannot use GetBlockRange with sendReq');
    }
    const id = this.nextId();
    const req = new Request(id, body);
    const buf = ByteBuffer.alloc(4096);
    req.serialize(buf);
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
    const req = new Request(id, {
      type: BodyType.GetBlockRange,
      minHeight,
      maxHeight,
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

    this.socket.on('ping', _data => {
      this.lastMsgReceived = Date.now();
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
        const res = Response.deserialize(buf);
        await this.handleMsg(res);
      } catch (e) {
        log.error('Failed to deserialize response:', e);
      } finally {
        this.socketMsgHandleLock.unlock();
      }
    });
  }

  private async handleMsg(res: Response): Promise<void> {
    const id = res.id;
    if (id === MAX_U32) {
      if (res.body.type === BodyType.Error) {
        log.error('Received IO error:', res);
        return;
      }

      this.emit('sub_msg', res.body);
      return;
    }

    {
      const streamFn = this.blockRangeStreams[id];
      if (streamFn !== undefined) {
        if (res.body.type === BodyType.GetBlock) {
          // Stream update
          await streamFn(undefined, res.body.block);
        } else if (res.body.type === BodyType.GetBlockRange) {
          // Stream finalized
          delete this.blockRangeStreams[id];
          await streamFn(undefined, undefined);
        } else if (res.body.type === BodyType.Error) {
          // Stream error
          delete this.blockRangeStreams[id];
          await streamFn(res.body.error, undefined);
        }
        return;
      }
    }

    const fns = this.inflightReqs[id];
    if (!fns) {
      log.error('Unrecognized response id:', res);
      return;
    }
    const [resolve, reject] = fns;
    delete this.inflightReqs[id];

    if (res.body.type === BodyType.Error) {
      reject(res.body.error);
      return;
    }
    resolve(res.body);
  }
}

export function initClient(url: string): void {
  if (instance) throw new Error('client already initialized');
  instance = new ClientImpl(url);
}

export function getClient(): PersistentClient {
  return instance!;
}
