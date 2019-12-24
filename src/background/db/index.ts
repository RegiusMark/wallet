import { SecretKey } from '../crypto';
import { app } from 'electron';
import sql, { RunResult } from 'sqlite3';
import path from 'path';
import fs from 'fs';

import { Table, CryptoManager, TableConstructor } from './table';
import { runMigrations } from './migrations';

export { Table } from './table';
export * from './tables';

enum DbState {
  Open,
  Initializing,
  Closed,
}

let state = DbState.Closed;
let dbInstance: WalletDb | null = null;

export class WalletDb {
  private db: DbWrapper;
  private crypto: DbCrypto;
  private tables: { [key: string]: Table } = {};

  private constructor(db: DbWrapper, secretKey: SecretKey) {
    this.db = db;
    this.crypto = new DbCrypto(secretKey);
  }

  public getTable<T extends Table>(table: TableConstructor<T>): T {
    const name = table.name;
    let tbl = this.tables[name] as T;
    if (!tbl) {
      tbl = this.tables[name] = new table(this.crypto);
    }
    return tbl;
  }

  public run(sql: string, params?: any): Promise<RunResult> {
    return this.db.run(sql, params);
  }

  public async get(sql: string, params?: any, isBlob = false): Promise<any> {
    const val = await this.db.get(sql, params);
    return val && isBlob ? val.value : val;
  }

  public all(sql: string, params?: any): Promise<any> {
    return this.db.all(sql, params);
  }

  public static getInstance(): WalletDb {
    if (!(dbInstance && state === DbState.Open)) throw new Error('database not open');
    return dbInstance;
  }

  public static async init(key: SecretKey): Promise<void> {
    // Atomic check and update happens here to prevent race condition with initialization
    if (state !== DbState.Closed) throw new Error('database already open');
    state = DbState.Initializing;

    const dbLoc = WalletDb.getLoc();
    const dbWrapper = await DbWrapper.open(dbLoc);
    dbInstance = new WalletDb(dbWrapper, key);
    await runMigrations(dbInstance);

    /* eslint-disable-next-line require-atomic-updates */
    state = DbState.Open;
  }

  public static delete(): void {
    if (state !== DbState.Closed) throw new Error('cannot delete db when initialized');
    const dbLoc = WalletDb.getLoc();
    if (fs.existsSync(dbLoc)) {
      fs.unlinkSync(dbLoc);
    }
  }

  private static getLoc(): string {
    return path.join(app.getPath('userData'), 'db.sqlite');
  }
}

class DbWrapper {
  public inner: sql.Database;

  private constructor(inner: sql.Database) {
    this.inner = inner;
  }

  public run(sql: string, params: any = []): Promise<RunResult> {
    return new Promise<RunResult>((resolve, reject): void => {
      this.inner.run(sql, params, function(err): void {
        if (err) return reject(err);
        resolve(this);
      });
    });
  }

  public all(sql: string, params: any = []): Promise<any[]> {
    return new Promise((resolve, reject): void => {
      this.inner.all(sql, params, function(this: sql.Statement, err, rows) {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  public get(sql: string, params: any = []): Promise<any> {
    return new Promise((resolve, reject): void => {
      this.inner.get(sql, params, function(this: sql.Statement, err, row) {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  public static open(filepath: string): Promise<DbWrapper> {
    return new Promise<DbWrapper>((resolve, reject): void => {
      const db = new sql.Database(filepath, (err): void => {
        if (err) return reject(err);
        resolve(new DbWrapper(db));
      });
    });
  }
}

class DbCrypto implements CryptoManager {
  private secretKey: SecretKey;

  public constructor(secretKey: SecretKey) {
    this.secretKey = secretKey;
  }

  public encrypt(data: Buffer | Uint8Array): Buffer {
    return this.secretKey.encrypt(data);
  }

  public decrypt(data: Buffer | Uint8Array): Buffer {
    return this.secretKey.decrypt(data);
  }
}
