import { Module, Mutation, VuexModule } from 'vuex-module-decorators';
import { ScriptHash, TransferTxV0, Asset, Script } from 'regiusmark';
import { SyncStatus } from '@/ipc-models';
import { TxRow } from '@/background/db';
import Big from 'big.js';

export interface DisplayableTxData {
  meta: {
    /* Transaction row as seen in the database */
    row: TxRow;
    /* Whether or not the transaction is expanded */
    expanded: boolean;
    /* User provided description about the transaction */
    desc: string | null;
  };
  /* Formatted Date string */
  time: string;
  /* Incoming or outgoing P2SH address */
  address: string;
  /* Whether or not the transaction was sent (true) or received (false) */
  incoming: boolean;
  /* Asset number as string without ticker */
  amount: string;
  /* Asset number as string without ticker */
  fee: string;
  /* Lazy parsed UTF-8 memo string */
  memo: string | null;
}

export class DisplayableTx implements DisplayableTxData {
  public meta: {
    row: TxRow;
    expanded: boolean;
    desc: string | null;
  };
  public time: string;
  public address: string;
  public incoming: boolean;
  public amount: string;
  public fee: string;
  public memo: string | null;

  constructor(data: DisplayableTxData) {
    this.meta = data.meta;
    this.time = data.time;
    this.address = data.address;
    this.incoming = data.incoming;
    this.amount = data.amount;
    this.fee = data.fee;
    this.memo = data.memo;
  }

  public hasMemo(): boolean {
    const tx = this.meta.row.tx.tx;
    return tx instanceof TransferTxV0 && tx.memo.length > 0;
  }

  public parseMemo(force: boolean): void {
    // hasMemo is a type guard for TransferTxV0
    const tx = this.meta.row.tx.tx as TransferTxV0;
    if (!this.hasMemo()) {
      throw new Error('cannot parse memo on this transaction');
    }

    try {
      const decoder = new TextDecoder('utf8', {
        fatal: !force,
      });
      this.memo = decoder.decode(tx.memo);
    } catch {
      // Contains invalid UTF-8 characters
    }
  }
}

export interface InitData {
  syncStatus: SyncStatus;
  txs: TxRow[];
  script: Script;
  totalBal: Asset;
}

export interface UpdateExpandState {
  index: number;
  expanded: boolean;
}

@Module({
  name: 'wallet',
  namespaced: true,
})
export default class WalletStore extends VuexModule {
  // Static data once initialized
  public initialized: boolean = false;
  public p2shScript: Script | null = null;
  public p2shAddr: ScriptHash | null = null;

  // Dynamic data
  public syncStatus = SyncStatus.Connecting;
  public txs: DisplayableTx[] = [];
  public totalBal: Asset = new Asset(Big(0));

  @Mutation
  public setInitialized(initialized: boolean): void {
    this.initialized = initialized;
  }

  @Mutation
  public setData(data: InitData): void {
    this.syncStatus = data.syncStatus;
    this.p2shScript = data.script;
    this.p2shAddr = data.script.hash();
    this.totalBal = data.totalBal;

    const txs = [];
    for (const tx of data.txs) {
      const dtx = toDisplayableTx(this.p2shAddr!, tx);
      if (dtx) {
        txs.push(dtx);
      }
    }
    this.txs = txs.reverse();
  }

  @Mutation
  public setSyncStatus(status: SyncStatus): void {
    this.syncStatus = status;
  }

  @Mutation
  public setTotalBalance(bal: Asset): void {
    this.totalBal = bal;
  }

  @Mutation
  public insertTxs(txs: TxRow[]): void {
    const dtxs = [];
    for (const tx of txs) {
      const dtx = toDisplayableTx(this.p2shAddr!, tx);
      if (dtx) {
        dtxs.push(dtx);
      }
    }
    dtxs.reverse();

    this.txs.unshift(...dtxs);
  }

  @Mutation
  public setExpandState(data: UpdateExpandState): void {
    this.txs[data.index].meta.expanded = data.expanded;
  }
}

function toDisplayableTx(addr: ScriptHash, txRow: TxRow): DisplayableTx | undefined {
  const tx = txRow.tx.tx;
  if (!(tx instanceof TransferTxV0)) return;
  const incoming = Buffer.compare(tx.to.bytes, addr.bytes) === 0;
  return new DisplayableTx({
    meta: {
      row: txRow,
      expanded: false,
      desc: txRow.desc,
    },
    time: new Date(tx.timestamp.toNumber()).toLocaleString(),
    address: incoming ? tx.from.toWif() : tx.to.toWif(),
    incoming,
    amount: tx.amount.toString(false),
    fee: tx.fee.toString(false),
    memo: null,
  });
}
