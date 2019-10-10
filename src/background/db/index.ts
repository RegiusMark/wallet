import { SecretKey } from '../crypto';
import { app } from 'electron';
import sql from 'sqlite3';
import path from 'path';
import fs from 'fs';

import { runMigrations } from './migrations';
import { Table } from './table';

export { Table } from './table';

enum DbState {
  Open,
  Initializing,
  Closed,
}

let state = DbState.Closed;
let dbInstance: WalletDb | null = null;

export class WalletDb {
  private db: DbWrapper;
  private secretKey: SecretKey;
  private tables: { [key: string]: Table } = {};

  private constructor(db: DbWrapper, secretKey: SecretKey) {
    this.db = db;
    this.secretKey = secretKey;
  }

  public getTable<T extends Table>(table: T & Function): T {
    const name = table.name;
    let tbl = this.tables[name];
    if (!tbl) {
      // `table` is a class that is constructable
      tbl = this.tables[name] = new (table as any)();
    }
    return tbl as T;
  }

  public run(sql: string, params?: any): Promise<void> {
    return this.db.run(sql, params);
  }

  public get(sql: string, params?: any): Promise<any> {
    return this.db.get(sql, params);
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

    // eslint-disable-next-line require-atomic-updates
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

  public run(sql: string, params: any = []): Promise<void> {
    return new Promise<void>((resolve, reject): void => {
      this.inner.run(sql, params, err => {
        if (err) return reject(err);
        resolve();
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
