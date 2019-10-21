import { Settings, NoAvailableSettings, setGlobalSettings, getGlobalSettings } from './settings';
import { SecretKey, DecryptError, DecryptErrorType } from './crypto';
import { createDashboardWindow, getWindowInstance } from './index';
import { WalletDb, TxsTable, KvTable } from './db';
import { initSynchronizer } from './synchronizer';
import * as models from '../ipc-models';
import sodium from 'libsodium-wrappers';
import { initClient } from './client';
import { randomBytes } from 'crypto';
import { ipcMain } from 'electron';
import { KeyPair } from 'godcoin';
import { Logger } from '../log';

const log = new Logger('main:ipc');

export default function(): void {
  ipcMain.on(models.APP_ACTION_REQ, async (evt, payload: models.AppActionReq) => {
    try {
      const req = payload.req;
      let response: models.ResModel;

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

            response = {
              type: 'wallet:pre_init',
              status: 'success',
            };

            try {
              await WalletDb.init(settings.dbSecretKey);
              initClient('ws://127.0.0.1:7777');
              await initSynchronizer([settings.keyPair.publicKey.toScript().hash()]);
              createDashboardWindow();
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
          const db = WalletDb.getInstance();
          const txsTable = db.getTable(TxsTable);
          const kvTable = db.getTable(KvTable);

          const publicKey = getGlobalSettings().keyPair.publicKey.buffer;
          const totalBalance = (await kvTable.getTotalBalance()).amount.toString();
          const txs = await txsTable.getAll();

          response = {
            type: 'wallet:post_init',
            publicKey,
            totalBalance,
            txs,
          };
          break;
        }
        default: {
          const _exhaustiveCheck: never = req;
          throw new Error('unreachable state: ' + JSON.stringify(_exhaustiveCheck));
        }
      }

      const reply: models.AppActionRes = {
        id: payload.id,
        res: response,
      };
      evt.reply(models.APP_ACTION_RES, reply);
    } catch (e) {
      log.error('Failed to handle IPC request:', e);
    }
  });
}

export function emitSyncUpdate(update: models.SyncUpdateRaw): void {
  const window = getWindowInstance();
  if (window === null) {
    log.error('No active window to send update');
    return;
  }

  window.webContents.send('sync_update', update);
}
