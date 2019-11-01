import { Settings, NoAvailableSettings, setGlobalSettings, getGlobalSettings } from './settings';
import { KeyPair, BodyType, ScriptHash, Asset, TxVariant, TransferTxV0 } from 'regiusmark';
import { SecretKey, DecryptError, DecryptErrorType } from './crypto';
import { createDashboardWindow, getWindowInstance } from './index';
import { initSynchronizer, getSynchronizer } from './synchronizer';
import { WalletDb, TxsTable, KvTable } from './db';
import { initClient, getClient } from './client';
import * as models from '../ipc-models';
import sodium from 'libsodium-wrappers';
import { randomBytes } from 'crypto';
import { ipcMain } from 'electron';
import { Logger } from '../log';
import Big from 'big.js';
import Long from 'long';

const log = new Logger('main:ipc');

function respond(event: Electron.IpcMainEvent, id: number, res: models.ResModel): void {
  const reply: models.AppActionRes = {
    id,
    res,
  };
  event.reply(models.APP_ACTION_RES, reply);
}

export default function(): void {
  ipcMain.on(models.APP_ACTION_REQ, async (evt, payload: models.AppActionReq) => {
    try {
      const req = payload.req;
      let response: models.ResModel | undefined;

      switch (req.type) {
        case 'wallet:first_setup': {
          const secretKey = new SecretKey(randomBytes(sodium.crypto_secretbox_KEYBYTES));
          const keyPair = KeyPair.fromWif(req.privateKey);

          const settings = new Settings({
            dbSecretKey: secretKey,
            keyPair,
          });
          settings.save(req.password);

          // Reset the database because we have a new encryption key and any cached data is now invalid
          WalletDb.delete();

          response = {
            type: 'wallet:first_setup',
          };
          break;
        }
        case 'wallet:pre_init': {
          const password = req.password;
          try {
            const settings = Settings.load(password);
            setGlobalSettings(settings);

            try {
              await WalletDb.init(settings.dbSecretKey);
              initClient(NODE_URL);
              await initSynchronizer([settings.p2shAddr]);
              createDashboardWindow();

              // Don't set a response if everything is successful as the current window is being destroyed.
            } catch (e) {
              log.error('A severe error has occurred:', e);
              // This error won't be logged from the outer catch
              throw new Error();
            }
          } catch (e) {
            // Errors from Settings.load() are logged
            let status: 'success' | 'incorrect_password' | 'invalid_checksum' | 'no_settings_available' | 'unknown';
            if (e instanceof NoAvailableSettings) {
              status = 'no_settings_available';
            } else if (e instanceof DecryptError && e.type === DecryptErrorType.INCORRECT_PASSWORD) {
              status = 'incorrect_password';
            } else if (e instanceof DecryptError && e.type === DecryptErrorType.INVALID_CHECKSUM) {
              status = 'invalid_checksum';
            } else {
              status = 'unknown';
            }
            response = {
              type: 'wallet:pre_init',
              status,
            };
          }
          break;
        }
        case 'wallet:post_init': {
          const syncStatus = getSynchronizer().getSyncStatus();

          const db = WalletDb.getInstance();
          const txsTable = db.getTable(TxsTable);
          const kvTable = db.getTable(KvTable);

          const script = getGlobalSettings().p2shScript.bytes;
          const totalBalance = (await kvTable.getTotalBalance()).amount.toString();
          const txs = await txsTable.getAll();

          response = {
            type: 'wallet:post_init',
            syncStatus,
            script,
            totalBalance,
            txs,
          };
          break;
        }
        case 'wallet:get_fee': {
          const client = getClient();
          const settings = getGlobalSettings();
          try {
            const res = await client.sendReq({
              type: BodyType.GetAddressInfo,
              addr: settings.p2shAddr,
            });
            if (res.type !== BodyType.GetAddressInfo) {
              throw new Error('unexpected RPC response: ' + res);
            }

            response = {
              type: 'wallet:get_fee',
              data: {
                netFee: res.info.netFee.amount.toString(),
                addrFee: res.info.addrFee.amount.toString(),
              },
            };
          } catch (e) {
            response = {
              type: 'wallet:get_fee',
              error: e.message,
            };
          }
          break;
        }
        case 'wallet:get_private_key': {
          const settings = getGlobalSettings();
          response = {
            type: 'wallet:get_private_key',
            seed: settings.keyPair.privateKey.seed,
          };
          break;
        }
        case 'wallet:transfer_funds': {
          const data: models.TransferFundsReq = {
            toAddress: new ScriptHash(req.toAddress),
            amount: new Asset(Big(req.amount)),
            fee: new Asset(Big(req.fee)),
            memo: req.memo,
          };

          const settings = getGlobalSettings();
          const tx = new TxVariant(
            new TransferTxV0(
              {
                timestamp: Long.fromNumber(Date.now(), true),
                fee: data.fee,
                signaturePairs: [],
              },
              {
                from: settings.p2shAddr,
                to: data.toAddress,
                script: settings.p2shScript,
                amount: data.amount,
                memo: data.memo,
              },
            ),
          );
          tx.sign(settings.keyPair, true);
          const txBuf = Buffer.from(tx.serialize().sharedView());

          const synchronizer = getSynchronizer();
          let timeoutTimer: NodeJS.Timeout | undefined;

          const listener = (update: models.SyncUpdateRaw): void => {
            if (!update.newData) return;
            for (const tx of update.newData.txs) {
              if (Buffer.compare(txBuf, tx.tx) === 0) {
                clearListenerAndRespond(undefined);
              }
            }
          };

          const clearListenerAndRespond = (error: string | undefined): void => {
            synchronizer.removeListener('sync_update', listener);
            if (timeoutTimer) {
              clearTimeout(timeoutTimer);
              timeoutTimer = undefined;
            }
            respond(evt, payload.id, {
              type: 'wallet:transfer_funds',
              error,
            });
          };

          synchronizer.on('sync_update', listener);

          timeoutTimer = setTimeout(() => {
            timeoutTimer = undefined;
            clearListenerAndRespond('timeout');
          }, 15000);

          try {
            const client = getClient();
            const res = await client.sendReq({
              type: BodyType.Broadcast,
              tx,
            });

            if (res.type !== BodyType.Broadcast) {
              throw new Error('unexpected RPC response: ' + res);
            }
          } catch (e) {
            clearListenerAndRespond(e.message);
          }
          break;
        }
        default: {
          const _exhaustiveCheck: never = req;
          throw new Error('unreachable state: ' + JSON.stringify(_exhaustiveCheck));
        }
      }

      if (response !== undefined) {
        respond(evt, payload.id, response);
      }
    } catch (e) {
      log.error('Failed to handle IPC request:', e);
    }
  });
}

export function emitSyncUpdate(update: models.SyncUpdateRaw): void {
  const window = getWindowInstance();
  if (window === null) {
    return;
  }

  window.webContents.send('sync_update', update);
}
