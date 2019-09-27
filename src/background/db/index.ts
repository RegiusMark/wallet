import { app } from 'electron';
import sql from 'sqlite3';
import path from 'path';

import { runMigrations } from './migrations';
import { Table } from './table';

export { Table } from './table';

let dbInstance: WalletDb | null = null;

export class WalletDb {
  private db: DbWrapper;
  private tables: { [key: string]: Table } = {};

  private constructor(db: DbWrapper) {
    this.db = db;
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

  public static getConnection(): WalletDb {
    if (!dbInstance) throw new Error('database not open');
    return dbInstance;
  }

  public static async init(): Promise<void> {
    if (dbInstance) throw new Error('database already open');
    const dbLoc = path.join(app.getPath('userData'), 'db.sqlite');
    const dbWrapper = await DbWrapper.open(dbLoc);
    dbInstance = new WalletDb(dbWrapper);
    await runMigrations(dbInstance);
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
