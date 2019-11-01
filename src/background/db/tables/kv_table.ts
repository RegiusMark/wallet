import { Table, CryptoManager } from '../table';
import { ByteBuffer, Asset } from 'regiusmark';
import { WalletDb } from '..';
import Big from 'big.js';
import Long from 'long';

export const KV_TABLE_NAME = 'kvstore';

/**
 * Table for storing data in a key-value fashion
 */
export class KvTable extends Table {
  public constructor(crypto: CryptoManager) {
    super(crypto);
  }

  public tableName(): string {
    return KV_TABLE_NAME;
  }

  public async getSyncHeight(): Promise<Long | undefined> {
    const val = await this.get('block_sync_height');
    if (!val) return;
    const buf = ByteBuffer.from(val);
    return buf.readUint64();
  }

  public async setSyncHeight(height: Long): Promise<void> {
    const buf = ByteBuffer.alloc(8);
    buf.writeUint64(height);
    await this.set('block_sync_height', buf.sharedView());
  }

  public async getTotalBalance(): Promise<Asset> {
    const val = await this.get('total_balance');
    if (!val) return new Asset(Big(0));
    const buf = ByteBuffer.from(val.slice(0, val.length));
    const len = buf.readUint8();
    const str = buf.readUTF8String(len);
    return new Asset(Big(str));
  }

  public async setTotalBalance(bal: Asset): Promise<void> {
    const str = bal.amount.toString();
    const buf = ByteBuffer.alloc(32);
    buf.writeUint8(str.length);
    buf.writeUTF8String(str);
    await this.set('total_balance', buf.sharedView());
  }

  private async get(key: string): Promise<Buffer | undefined> {
    const db = WalletDb.getInstance();
    const val = await db.get(`SELECT value FROM ${this.tableName()} WHERE key=?`, key, true);
    return val !== undefined ? this.crypto.decrypt(val) : undefined;
  }

  private async set(key: string, value: Buffer | Uint8Array): Promise<void> {
    const db = WalletDb.getInstance();
    await db.run(
      `
      INSERT INTO ${this.tableName()}(key, value) VALUES(?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value=excluded.value
      `,
      [key, this.crypto.encrypt(value)],
    );
  }
}
