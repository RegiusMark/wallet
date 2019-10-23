import { TxRow, TxRawRow } from './background/db';
import { Asset, Script } from 'godcoin';

export const APP_ACTION_REQ = 'APP_ACTION_REQ';
export const APP_ACTION_RES = 'APP_ACTION_RES';

/*** RPC models ***/

export interface AppActionReq {
  id: number;
  req: ReqModel;
}

export interface AppActionRes {
  id: number;
  res: ResModel;
}

export type ReqModel = FirstSetupReq | PreInitWalletReq | PostInitWalletRawReq | GetFeeRawReq;
export type ResModel = FirstSetupRes | PreInitWalletRes | PostInitWalletRawRes | GetFeeRawRes;

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
  syncStatus: SyncStatus;
  script: Uint8Array;
  totalBalance: string;
  txs: TxRawRow[];
}

export interface PostInitWalletRes {
  syncStatus: SyncStatus;
  script: Script;
  totalBalance: Asset;
  txs: TxRow[];
}

export interface GetFeeRawReq {
  type: 'wallet:get_fee';
}

export interface GetFeeRawRes {
  type: 'wallet:get_fee';
  data?: {
    netFee: string;
    addrFee: string;
  };
  error?: string;
}

export interface GetFeeRes {
  data?: {
    netFee: Asset;
    addrFee: Asset;
  };
  error?: string;
}

/*** IPC events (main -> renderer) ***/

export enum SyncStatus {
  Complete,
  InProgress,
  Connecting,
}

export interface SyncUpdateRaw {
  status: SyncStatus;
  newData?: {
    totalBalance: string;
    txs: TxRawRow[];
  };
}

export interface SyncUpdate {
  status: SyncStatus;
  newData?: {
    totalBalance: Asset;
    txs: TxRow[];
  };
}
