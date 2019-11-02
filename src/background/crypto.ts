import { scryptSync, createHash, randomBytes, ScryptOptions } from 'crypto';
import sodium from 'libsodium-wrappers';
import assert from 'assert';

function hash(data: string | Buffer | Uint8Array): Buffer {
  const hasher = createHash('sha256');
  hasher.update(data);
  return hasher.digest();
}

/**
 * Provides a friendly interface around the secretbox crypto APIs provided by libsodium.
 */
export class SecretKey {
  private key?: Uint8Array;

  constructor(key: Uint8Array) {
    this.key = key;
    assert(key.byteLength === sodium.crypto_secretbox_KEYBYTES, 'expected key length to be secretbox KEYBYTES');
  }

  public encrypt(data: Buffer | Uint8Array): Buffer {
    assert(this.key !== undefined, 'key has been zeroed');
    const nonce = randomBytes(sodium.crypto_secretbox_NONCEBYTES);
    const enc = sodium.crypto_secretbox_easy(data, nonce, this.key!);

    const buf = Buffer.concat([nonce, enc]);
    const checksum = hash(buf).slice(0, 4);
    return Buffer.concat([buf, checksum]);
  }

  public decrypt(data: Buffer | Uint8Array): Buffer {
    assert(this.key !== undefined, 'key has been zeroed');
    assert(data.byteLength > sodium.crypto_secretbox_NONCEBYTES, 'data must be at least NONCEBYTES + 1 bytes');
    const nonce = data.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const enc = data.slice(sodium.crypto_secretbox_NONCEBYTES, data.length - 4);

    const checksum_a = data.slice(data.length - 4, data.length);
    const checksum_b = hash(data.slice(0, data.length - 4)).slice(0, 4);
    if (Buffer.compare(checksum_a, checksum_b) !== 0) {
      throw new DecryptError('invalid checksum');
    }

    try {
      const dec = sodium.crypto_secretbox_open_easy(enc, nonce, this.key!);
      return Buffer.from(dec);
    } catch (e) {
      throw new DecryptError(e.message);
    }
  }

  public bytes(): Uint8Array {
    assert(this.key !== undefined, 'key has been zeroed');
    return this.key!;
  }

  public zero(): void {
    if (this.key) {
      sodium.memzero(this.key);
      this.key = undefined;
    }
  }

  public static derive(password: string, salt: Uint8Array, opts: ScryptOptions): SecretKey {
    const h = scryptSync(password, salt, 32, opts);
    return new SecretKey(h);
  }
}

export enum DecryptErrorType {
  INCORRECT_PASSWORD = 'incorrect_password',
  INVALID_CHECKSUM = 'invalid_checksum',
  UNKNOWN = 'unknown_error',
}

export class DecryptError extends Error {
  public readonly type: DecryptErrorType;

  constructor(msg: string) {
    super(msg);
    switch (msg) {
      case 'wrong secret key for the given ciphertext':
        this.type = DecryptErrorType.INCORRECT_PASSWORD;
        break;
      case 'invalid checksum':
        this.type = DecryptErrorType.INVALID_CHECKSUM;
        break;
      default:
        this.type = DecryptErrorType.UNKNOWN;
    }
    Object.setPrototypeOf(this, DecryptError.prototype);
  }
}
