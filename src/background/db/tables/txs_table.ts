import { Table, CryptoManager } from '../table';
import { TxVariant } from 'godcoin';
import { WalletDb } from '..';

export const TXS_TABLE_NAME = 'transactions';

export interface TxRawRow {
  id: number;
  desc: string | null;
  tx: Buffer;
}

export interface TxRow {
  id: number;
  desc: string | null;
  tx: TxVariant;
}

/**
 * Table for storing data in a key-value fashion
 */
export class TxsTable extends Table {
  public constructor(crypto: CryptoManager) {
    super(crypto);
  }

  public tableName(): string {
    return TXS_TABLE_NAME;
  }

  public async getAll(): Promise<TxRawRow[]> {
    const db = WalletDb.getInstance();
    const dbRows = await db.all(`SELECT * FROM ${this.tableName()}`);

    const rows: TxRawRow[] = [];
    for (const dbRow of dbRows) {
      const id = dbRow.id;
      const desc = dbRow.desc !== null ? this.crypto.decrypt(dbRow.desc).toString('utf8') : null;
      const tx = this.crypto.decrypt(dbRow.tx);
      rows.push({ id, desc, tx });
    }
    return rows;
  }

  public async insert(tx: TxVariant, desc?: string): Promise<void> {
    const txBuf = this.crypto.encrypt(tx.serialize().sharedView());
    const descBuf = desc !== undefined ? this.crypto.encrypt(Buffer.from(desc, 'utf8')) : null;

    const db = WalletDb.getInstance();
    await db.run(`INSERT INTO ${this.tableName()}(tx, desc) VALUES(?,?)`, [txBuf, descBuf]);
  }
}
