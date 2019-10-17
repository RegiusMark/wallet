import { Table, CryptoManager } from '../table';
import { TxVariant, ByteBuffer } from 'godcoin';
import { WalletDb } from '..';

export const TXS_TABLE_NAME = 'transactions';

export interface TxRow {
  id: number;
  tx: TxVariant;
  desc: string | null;
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

  public async getAll(): Promise<TxRow[]> {
    const db = WalletDb.getInstance();
    const dbRows = await db.all(`SELECT * FROM ${this.tableName()}`);

    const rows: TxRow[] = [];
    for (const dbRow of dbRows) {
      rows.push({
        id: dbRow.id,
        tx: TxVariant.deserialize(ByteBuffer.from(this.crypto.decrypt(dbRow.tx))),
        desc: dbRow.desc !== null ? this.crypto.decrypt(dbRow.desc).toString('utf8') : null,
      });
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
