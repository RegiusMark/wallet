import { readFileSync, unlinkSync, renameSync, existsSync, writeFileSync } from 'fs';
import { KeyPair, Script, ScriptHash } from 'regiusmark';
import { SecretKey } from './crypto';
import { Logger } from '../log';
import { app } from 'electron';
import path from 'path';

const log = new Logger('main:settings');

const CRYPTO_VERSION = 1;

let globalSettings: Settings | undefined;

interface SettingsData {
  dbSecretKey: SecretKey;
  keyPair: KeyPair;
}

export class Settings implements SettingsData {
  public readonly dbSecretKey: SecretKey;
  public readonly keyPair: KeyPair;
  public readonly p2shScript: Script;
  public readonly p2shAddr: ScriptHash;

  public constructor(data: SettingsData) {
    this.dbSecretKey = data.dbSecretKey;
    this.keyPair = data.keyPair;
    this.p2shScript = this.keyPair.publicKey.toScript();
    this.p2shAddr = this.p2shScript.hash();
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
    }

    // Write the new settings
    writeFileSync(loc, data);

    // Clear the backup
    if (existsSync(bakLoc)) {
      unlinkSync(bakLoc);
    }
  }

  private serializeEnc(password: string): Buffer {
    const version = Buffer.alloc(2);
    version.writeUInt16BE(CRYPTO_VERSION, 0);

    const unencryptedData = Buffer.from(
      JSON.stringify({
        secretKey: Buffer.from(this.dbSecretKey.bytes()).toString('base64'),
        privateKey: this.keyPair.privateKey.toWif(),
      }),
      'utf8',
    );

    const localKey = SecretKey.fromString(password);
    const encData = localKey.encrypt(unencryptedData);
    localKey.zero();

    return Buffer.concat([version, encData]);
  }

  public static load(password: string): Settings {
    const locs = Settings.settingsLoc();

    const primaryExists = existsSync(locs.primary);
    const backupExists = existsSync(locs.backup);

    if (primaryExists) {
      try {
        return Settings.deserializeEnc(locs.primary, password);
      } catch (e) {
        // Log here to prevent error swallowing
        log.error('Failed to read from primary data store:', e);
        if (!backupExists) {
          // Propagate the error as there are no more locations to read from
          throw e;
        }
      }
    }

    if (backupExists) {
      try {
        const settings = Settings.deserializeEnc(locs.backup, password);
        log.info('Successfully recovered from backup');

        if (primaryExists) {
          const newLoc = locs.primary + '.' + Date.now();
          renameSync(locs.primary, newLoc);
          log.info('Moved the potentially corrupt data store to ' + newLoc);
        }
        renameSync(locs.backup, locs.primary);
        return settings;
      } catch (e) {
        // Log here to prevent error swallowing
        log.error('Failed to read from backup data store:', e);
        throw e;
      }
    }

    // Log here to prevent error swallowing
    log.error('No more setting data stores available');
    throw new NoAvailableSettings();
  }

  private static deserializeEnc(loc: string, password: string): Settings {
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
            dbSecretKey: new SecretKey(Buffer.from(obj.secretKey, 'base64')),
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

  public static existsOnDisk(): boolean {
    const locs = Settings.settingsLoc();
    return existsSync(locs.primary) || existsSync(locs.backup);
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

export class NoAvailableSettings extends Error {
  public constructor() {
    super('No available settings to read from');
    Object.setPrototypeOf(this, NoAvailableSettings.prototype);
  }
}

export function setGlobalSettings(val: Settings): void {
  globalSettings = val;
}

export function getGlobalSettings(): Settings {
  return globalSettings!;
}

export function isSettingsLoaded(): boolean {
  return globalSettings !== undefined;
}
