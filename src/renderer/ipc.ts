import { KeyPair, TxVariant, ByteBuffer, Asset, Script } from 'regiusmark';
import { TxRow } from '@/background/db';
import * as models from '@/ipc-models';
import { ipcRenderer } from 'electron';
import { Logger } from '@/log';
import Big from 'big.js';

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
      type: 'wallet:first_setup',
      password,
      privateKey: typeof keyPair === 'string' ? keyPair : keyPair.privateKey.toWif(),
    });
    const ipcRes = await this.preInit(password);
    if (ipcRes.status !== 'success') {
      throw new Error('Failed to complete load settings after setup: ' + ipcRes.status);
    }
  }

  public async preInit(password: string): Promise<models.PreInitWalletRes> {
    const ipcRes = await this.send(
      {
        type: 'wallet:pre_init',
        password,
      },
      15000,
    );
    if (ipcRes.type !== 'wallet:pre_init') {
      throw new Error('Unexpected IPC response: ' + JSON.stringify(ipcRes));
    }
    return ipcRes;
  }

  public async postInit(): Promise<models.PostInitWalletRes> {
    const ipcRes = await this.send({
      type: 'wallet:post_init',
    });
    if (ipcRes.type !== 'wallet:post_init') {
      throw new Error('Unexpected IPC response: ' + JSON.stringify(ipcRes));
    }

    const txs: TxRow[] = [];
    for (const txRow of ipcRes.txs) {
      txs.push({
        id: txRow.id,
        desc: txRow.desc,
        tx: TxVariant.deserialize(ByteBuffer.from(txRow.tx)),
      });
    }

    return {
      syncStatus: ipcRes.syncStatus,
      script: new Script(ipcRes.script),
      totalBalance: new Asset(Big(ipcRes.totalBalance)),
      txs,
    };
  }

  public async getFee(): Promise<models.GetFeeRes> {
    const ipcRes = await this.send({
      type: 'wallet:get_fee',
    });
    if (ipcRes.type !== 'wallet:get_fee') {
      throw new Error('Unexpected IPC response: ' + JSON.stringify(ipcRes));
    }

    return {
      data: ipcRes.data
        ? {
            netFee: new Asset(Big(ipcRes.data.netFee)),
            addrFee: new Asset(Big(ipcRes.data.addrFee)),
          }
        : undefined,
      error: ipcRes.error,
    };
  }

  public async getPrivateKey(): Promise<models.GetPrivateKeyRes> {
    const ipcRes = await this.send({
      type: 'wallet:get_private_key',
    });
    if (ipcRes.type !== 'wallet:get_private_key') {
      throw new Error('Unexpected IPC response: ' + JSON.stringify(ipcRes));
    }
    return {
      key: KeyPair.fromSeed(ipcRes.seed),
    };
  }

  public async transferFunds(req: models.TransferFundsReq): Promise<models.TransferFundsRawRes> {
    const ipcRes = await this.send(
      {
        type: 'wallet:transfer_funds',
        toAddress: req.toAddress.bytes,
        amount: req.amount.amount.toString(),
        fee: req.fee.amount.toString(),
        memo: req.memo,
      },
      30000,
    );
    if (ipcRes.type !== 'wallet:transfer_funds') {
      throw new Error('Unexpected IPC response: ' + JSON.stringify(ipcRes));
    }

    return ipcRes;
  }

  public onSyncUpdate(handler: (update: models.SyncUpdate) => void): void {
    ipcRenderer.on('sync_update', (_evt, rawData: models.SyncUpdateRaw) => {
      const data: models.SyncUpdate = {
        status: rawData.status,
      };
      if (rawData.newData) {
        const totalBalance = new Asset(Big(rawData.newData.totalBalance));
        const txs: TxRow[] = [];
        for (const txRow of rawData.newData.txs) {
          txs.push({
            id: txRow.id,
            desc: txRow.desc,
            tx: TxVariant.deserialize(ByteBuffer.from(txRow.tx)),
          });
        }

        data.newData = {
          totalBalance,
          txs,
        };
      }

      try {
        handler(data);
      } catch (e) {
        log.error('Error invoking onSyncUpdate handler', e);
      }
    });
  }

  public send(req: models.ReqModel, timeout = 5000): Promise<models.ResModel> {
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
      }, timeout);

      ipcRenderer.send(models.APP_ACTION_REQ, rpcReq);
    });
  }
}

export default new IpcManager();
