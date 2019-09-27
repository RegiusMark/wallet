import * as models from '@/ipc-models';
import { ipcRenderer } from 'electron';
import { Logger } from '@/log';

const log = new Logger('renderer:ipc');

class IpcManager {
  private id = 0;
  private promises: { [key: number]: (res: models.ResModel) => void } = {};

  public constructor() {
    ipcRenderer.on(models.APP_ACTION_RES, (_evt, payload: models.AppActionRes) => {
      const id = payload.id;
      const resolver = this.promises[id];
      if (resolver) {
        delete this.promises[id];
        resolver(payload.res);
      } else {
        log.error('Received unknown IPC payload:', payload);
      }
    });
  }

  public send(req: models.ReqModel): Promise<models.ResModel> {
    return new Promise((resolve, reject): void => {
      const id = this.id++;
      const rpcReq: models.AppActionReq = {
        id,
        req,
      };
      this.promises[id] = resolve;

      setTimeout(() => {
        if (this.promises[id]) {
          reject(new Error('IPC request timeout (req: ' + JSON.stringify(rpcReq) + ')'));
        }
      }, 5000);

      ipcRenderer.send(models.APP_ACTION_REQ, rpcReq);
    });
  }
}

export default new IpcManager();
