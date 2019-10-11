export interface TableConstructor<T extends Table> {
  new (crypto: CryptoManager): T;
}

export interface CryptoManager {
  encrypt(data: Buffer | Uint8Array): Buffer;
  decrypt(data: Buffer | Uint8Array): Buffer;
}

export abstract class Table {
  protected crypto: CryptoManager;

  constructor(crypto: CryptoManager) {
    this.crypto = crypto;
  }

  abstract tableName(): string;
}
