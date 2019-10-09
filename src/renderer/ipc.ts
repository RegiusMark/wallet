import * as models from '@/ipc-models';
import { ipcRenderer } from 'electron';
import { KeyPair } from 'godcoin';
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

  public async firstSetup(password: string, keyPair: string | KeyPair): Promise<void> {
    await this.send({
      type: 'settings:first_setup',
      password,
      privateKey: typeof keyPair === 'string' ? keyPair : keyPair.privateKey.toWif(),
    });
    const ipcRes = await this.send({
      type: 'settings:load_settings',
      password,
    });
    if (ipcRes.type !== 'settings:load_settings') {
      throw new Error('Unexpected IPC response: ' + JSON.stringify(ipcRes));
    }
    if (ipcRes.status !== 'success') {
      throw new Error('Failed to complete load settings after setup: ' + ipcRes.status);
    }
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
