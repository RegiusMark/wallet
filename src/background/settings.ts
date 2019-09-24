import { readFileSync, unlinkSync, renameSync, existsSync, writeFileSync } from 'fs';
import { SecretKey } from './crypto';
import { KeyPair } from 'godcoin';
import { Logger } from '../log';
import { app } from 'electron';
import path from 'path';

const log = new Logger('settings');

const CRYPTO_VERSION = 1;

interface SettingsData {
  secretKey: SecretKey;
  keyPair: KeyPair;
}

export class Settings implements SettingsData {
  public readonly secretKey: SecretKey;
  public readonly keyPair: KeyPair;

  public constructor(data: SettingsData) {
    this.secretKey = data.secretKey;
    this.keyPair = data.keyPair;
  }

  public save(password: string): void {
    const data = this.serializeEnc(password);
    const locs = Settings.settingsLoc();
    const loc = locs.primary;
    const bakLoc = locs.backup;

    // Remove any existing backup if it exists
    if (existsSync(bakLoc)) {
      unlinkSync(bakLoc);
    }

    // Move the current settings to a backup
    if (existsSync(loc)) {
      renameSync(loc, bakLoc);
      unlinkSync(loc);
    }

    // Write the new settings
    writeFileSync(loc, data);

    // Clear the backup
    unlinkSync(bakLoc);
  }

  private serializeEnc(password: string): Buffer {
    const version = Buffer.alloc(2);
    version.writeUInt16BE(CRYPTO_VERSION, 0);

    const unencryptedData = Buffer.from(
      JSON.stringify({
        secretKey: Buffer.from(this.secretKey.bytes()).toString('base64'),
        privateKey: this.keyPair.privateKey.toWif(),
      }),
      'utf8',
    );

    const localKey = SecretKey.fromString(password);
    const encData = localKey.encrypt(unencryptedData);
    localKey.zero();

    const buf = Buffer.concat([version, encData]);
    return buf;
  }

  public static load(password: string): Settings | undefined {
    const locs = Settings.settingsLoc();

    if (existsSync(locs.primary)) {
      try {
        return Settings.deserializeEnc(locs.primary, password);
      } catch (e) {
        log.error('Failed to read from primary data store:', e);
      }
    }

    if (existsSync(locs.backup)) {
      try {
        const settings = Settings.deserializeEnc(locs.backup, password);
        log.info('Successfully recovered from backup');

        if (existsSync(locs.primary)) {
          const newLoc = locs.primary + '.' + new Date().getTime();
          renameSync(locs.primary, newLoc);
          log.info('Moved the potentially corrupt data store to ' + newLoc);
        }
      } catch (e) {
        log.error('Failed to read from backup data store:', e);
      }
    }
  }

  private static deserializeEnc(loc: string, password: string): Settings {
    // TODO: handle invalid password error
    const fileData = readFileSync(loc);
    const version = fileData.readUInt16BE(0);
    const encData = fileData.slice(2);

    let data: SettingsData;
    switch (version) {
      case 1: {
        const localKey = SecretKey.fromString(password);
        try {
          const obj = JSON.parse(localKey.decrypt(encData).toString('utf8'));
          data = {
            secretKey: new SecretKey(Buffer.from(obj.secretKey, 'base64')),
            keyPair: KeyPair.fromWif(obj.privateKey),
          };
        } finally {
          localKey.zero();
        }
        break;
      }
      default: {
        throw new Error('unknown crypto version');
      }
    }
    return new Settings(data);
  }

  private static settingsLoc(): { primary: string; backup: string } {
    const primary = path.join(app.getPath('userData'), 'settings.dat');
    const backup = primary + '.bak';
    return {
      primary,
      backup,
    };
  }
}
