import { Asset, Script, ScriptHash, KeyPair } from 'godcoin';
import { TxRow, TxRawRow } from './background/db';

export const APP_ACTION_REQ = 'APP_ACTION_REQ';
export const APP_ACTION_RES = 'APP_ACTION_RES';

export const DOWNLOAD_UPDATE = 'ACTION_DOWNLOAD_UPDATE';
export const INSTALL_UPDATE = 'ACTION_INSTALL_UPDATE';
export const STATUS_UPDATE = 'STATUS_UPDATE';

/*** Update models ***/

export enum UpdateState {
  // No check has been performed
  Clean,
  // Checking for an update
  Checking,
  // Update is available
  UpdateAvailable,
  // Already up to date
  NoUpdateAvailable,
  // Downloading an update
  Downloading,
  // Downloaded update is ready to be installed
  ReadyForInstall,
  // Error during checking/downloading for updates
  Error,
}

export interface UpdateStatus {
  state: UpdateState;
  curVersion: string;
  newVersion: string | null;
  manualTrigger?: boolean;
}

/*** RPC models ***/

export interface AppActionReq {
  id: number;
  req: ReqModel;
}

export interface AppActionRes {
  id: number;
  res: ResModel;
}

export type ReqModel =
  | FirstSetupReq
  | PreInitWalletReq
  | PostInitWalletRawReq
  | GetFeeRawReq
  | GetPrivateKeyRawReq
  | TransferFundsRawReq;

export type ResModel =
  | FirstSetupRes
  | PreInitWalletRes
  | PostInitWalletRawRes
  | GetFeeRawRes
  | GetPrivateKeyRawRes
  | TransferFundsRawRes;

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

export interface GetPrivateKeyRawReq {
  type: 'wallet:get_private_key';
}

export interface GetPrivateKeyRawRes {
  type: 'wallet:get_private_key';
  seed: Uint8Array;
}

export interface GetPrivateKeyRes {
  key: KeyPair;
}

export interface TransferFundsRawReq {
  type: 'wallet:transfer_funds';
  toAddress: Uint8Array;
  amount: string;
  fee: string;
  memo: Uint8Array;
}

export interface TransferFundsReq {
  toAddress: ScriptHash;
  amount: Asset;
  fee: Asset;
  memo: Uint8Array;
}

export interface TransferFundsRawRes {
  type: 'wallet:transfer_funds';
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
