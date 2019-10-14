import { Table, CryptoManager } from '../table';
import { TxVariant } from 'godcoin';
import { WalletDb } from '..';

export const TXS_TABLE_NAME = 'transactions';

export interface TxRow {
  id: number;
  variant: TxVariant;
  desc?: string;
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

  public async insert(tx: TxVariant, desc?: string): Promise<void> {
    const txBuf = this.crypto.encrypt(tx.serialize().sharedView());
    const descBuf = desc !== undefined ? this.crypto.encrypt(Buffer.from(desc, 'utf8')) : null;

    const db = WalletDb.getInstance();
    await db.run(`INSERT INTO ${this.tableName()}(tx, desc) VALUES(?,?)`, [txBuf, descBuf]);
  }
}
