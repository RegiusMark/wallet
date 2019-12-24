import { TransferState } from './transfer-state';

export interface TxInProgressModel {
  active: boolean;
  state: TransferState;
  msg: string;
}
