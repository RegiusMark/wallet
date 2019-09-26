import * as models from '../ipc-models';
import sodium from 'libsodium-wrappers';
import { Settings, NoAvailableSettings } from './settings';
import { SecretKey, DecryptError, DecryptErrorType } from './crypto';
import { randomBytes } from 'crypto';
import { ipcMain } from 'electron';
import { KeyPair } from 'godcoin';
import { Logger } from '../log';

const log = new Logger('main:ipc');

let settings: Settings | undefined;

export default function() {
  ipcMain.on(models.APP_ACTION_REQ, async (evt, payload: models.AppActionReq) => {
    try {
      const req = payload.req;
      let response: models.ResModel;

      switch (req.type) {
        case 'settings:first_setup': {
          const secretKey = new SecretKey(randomBytes(sodium.crypto_secretbox_KEYBYTES));
          const keyPair = KeyPair.fromWif(req.privateKey);

          settings = new Settings({
            secretKey,
            keyPair,
          });
          settings.save(req.password);

          response = {
            type: 'settings:first_setup',
          };
          break;
        }
        case 'settings:does_exist': {
          const exists = Settings.exists();
          response = {
            type: 'settings:does_exist',
            exists,
          };
          break;
        }
        case 'settings:load_settings': {
          const password = req.password;
          try {
            settings = Settings.load(password);
            response = {
              type: 'settings:load_settings',
              status: 'success',
            };
          } catch (e) {
            // The error is logged from Settings.load()
            let status: 'success' | 'incorrect_password' | 'invalid_checksum' | 'no_settings_available' | 'unknown';
            if (e instanceof NoAvailableSettings) {
              status = 'no_settings_available';
            } else if (e instanceof DecryptError && e.type == DecryptErrorType.INCORRECT_PASSWORD) {
              status = 'incorrect_password';
            } else if (e instanceof DecryptError && e.type === DecryptErrorType.INVALID_CHECKSUM) {
              status = 'invalid_checksum';
            } else {
              status = 'unknown';
            }
            response = {
              type: 'settings:load_settings',
              status,
            };
          }
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
