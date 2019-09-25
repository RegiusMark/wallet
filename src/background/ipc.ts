import * as models from '../ipc-models';
import sodium from 'libsodium-wrappers';
import { Settings } from './settings';
import { SecretKey } from './crypto';
import { randomBytes } from 'crypto';
import { ipcMain } from 'electron';
import { KeyPair } from 'godcoin';

let settings: Settings | undefined;

export default function() {
  ipcMain.on(models.APP_ACTION_REQ, async (evt, payload: models.AppActionReq) => {
    const req = payload.req;
    let response: models.ResModel;

    switch (req.type) {
      case 'settings:first_setup': {
        const secretKey = new SecretKey(randomBytes(sodium.crypto_secretbox_NONCEBYTES));
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
      default: {
        const _exhaustiveCheck: never = req.type;
        throw new Error('unreachable state: ' + _exhaustiveCheck);
      }
    }

    const reply: models.AppActionRes = {
      id: payload.id,
      res: response,
    };
    evt.reply(models.APP_ACTION_RES, reply);
  });
}
