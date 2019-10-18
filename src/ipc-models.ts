import { TxRow, TxRawRow } from './background/db';
import { PublicKey } from 'godcoin';

export const APP_ACTION_REQ = 'APP_ACTION_REQ';
export const APP_ACTION_RES = 'APP_ACTION_RES';

export interface AppActionReq {
  id: number;
  req: ReqModel;
}

export interface AppActionRes {
  id: number;
  res: ResModel;
}

export type ReqModel = FirstSetupReq | PreInitWalletReq | PostInitWalletRawReq;
export type ResModel = FirstSetupRes | PreInitWalletRes | PostInitWalletRawRes;

export interface FirstSetupReq {
  type: 'wallet:first_setup';
  password: string; // User chosen password
  privateKey: string; // Must be in WIF format
}

export interface FirstSetupRes {
  type: 'wallet:first_setup';
}

export interface PreInitWalletReq {
  type: 'wallet:pre_init';
  password: string;
}

export interface PreInitWalletRes {
  type: 'wallet:pre_init';
  status: 'success' | 'incorrect_password' | 'invalid_checksum' | 'no_settings_available' | 'unknown';
}

export interface PostInitWalletRawReq {
  type: 'wallet:post_init';
}

export interface PostInitWalletRawRes {
  type: 'wallet:post_init';
  publicKey: Uint8Array;
  txs: TxRawRow[];
}

export interface PostInitWalletRes {
  publicKey: PublicKey;
  txs: TxRow[];
}
