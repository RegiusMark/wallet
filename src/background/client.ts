import { RequestBody, Request, ByteBuffer, Response, ResponseBody, BodyType, ErrorRes, NetworkError } from 'regiusmark';
import { EventEmitter } from 'events';
import { Logger } from '../log';
import WebSocket from 'ws';

const log = new Logger('main:client');

const MAX_U32 = 0xffff_ffff;
let instance: PersistentClient;

export class DisconnectedError extends Error {
  public constructor(msg?: string) {
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
  isOpen(): boolean;
  on(event: 'open', listener: () => void): this;
  on(event: 'close', listener: (code: string, reason: string | undefined, retryTime: number) => void): this;
  on(event: 'sub_msg', listener: (res: ResponseBody) => void): this;
}

type ResolveReq = (res: ResponseBody) => void;
type RejectReq = (err: Error) => void;

class ClientImpl extends EventEmitter {
  private url: string;
  private socket: WebSocket | undefined;
  private connectTimer: NodeJS.Timer | undefined;
  private prevCloseMsg: string | undefined;
  private prevErrorMsg: string | undefined;

  private currentId = 0;
  private inflightReqs: { [reqId: number]: [ResolveReq, RejectReq] } = {};

  public constructor(url: string) {
    super();
    this.url = url;
    this.tryOpen();
  }

  public sendReq(body: RequestBody): Promise<ResponseBody> {
    if (this.currentId === MAX_U32) {
      this.currentId = 0;
    }
    const id = this.currentId++;
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
            return;
          }
        });
      } else {
        reject(new DisconnectedError());
      }
    });
  }

  public isOpen(): boolean {
    return this.socket !== undefined && this.socket.readyState === WebSocket.OPEN;
  }

  private tryOpen(): void {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
    this.socket = new WebSocket(this.url);

    this.socket.on('open', () => {
      log.info('Connection to blockchain opened on url:', this.url);
      this.prevCloseMsg = undefined;
      this.prevErrorMsg = undefined;
      this.emit('open');
    });

    this.socket.on('close', (code, reason) => {
      const msg = 'Connection to blockchain closed (code: ' + code + ', reason: ' + reason + ')';
      if (msg !== this.prevCloseMsg) {
        log.info(msg);
        this.prevCloseMsg = msg;
      }
      this.socket = undefined;
      for (const req of Object.values(this.inflightReqs)) {
        // Reject any pending requests as they are no longer valid
        req[1](new DisconnectedError());
      }
      this.inflightReqs = {};

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

    this.socket.on('message', data => {
      if (!Buffer.isBuffer(data)) {
        log.error('Unexpected ws message:', data);
        return;
      }
      try {
        const buf = ByteBuffer.from(data);
        const res = Response.deserialize(buf);
        this.handleMsg(res);
      } catch (e) {
        log.error('Failed to deserialize response:', e);
      }
    });
  }

  private handleMsg(res: Response): void {
    const id = res.id;
    if (id === MAX_U32) {
      if (res.body.type === BodyType.Error) {
        log.error('Received IO error:', res);
        return;
      }

      this.emit('sub_msg', res.body);
      return;
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
