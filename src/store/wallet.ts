import { Module, Mutation, VuexModule } from 'vuex-module-decorators';
import { PublicKey, ScriptHash, TransferTxV0, Asset } from 'godcoin';
import { TxRow } from '@/background/db';
import Big from 'big.js';

export interface DisplayableTx {
  meta: {
    /* DB row ID */
    id: number;
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
}

export interface InitData {
  txs: TxRow[];
  publicKey: PublicKey;
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
  public publicKey: PublicKey | null = null;
  public p2shAddr: ScriptHash | null = null;

  // Dynamic data
  public txs: DisplayableTx[] = [];
  public totalBal: Asset = new Asset(Big(0));

  @Mutation
  public setInitialized(initialized: boolean): void {
    this.initialized = initialized;
  }

  @Mutation
  public setData(data: InitData): void {
    this.publicKey = data.publicKey;
    this.p2shAddr = data.publicKey.toScript().hash();
    this.totalBal = data.totalBal;

    const txs = [];
    for (const tx of data.txs) {
      const dtx = toDisplayableTx(this.p2shAddr!, tx);
      if (dtx) {
        txs.push(dtx);
      }
    }
    this.txs = txs;
  }

  @Mutation
  public setTotalBalance(bal: Asset): void {
    this.totalBal = bal;
  }

  @Mutation
  public insertTx(tx: TxRow): void {
    const dtx = toDisplayableTx(this.p2shAddr!, tx);
    if (dtx) {
      this.txs.push(dtx);
    }
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
  return {
    meta: {
      id: txRow.id,
      expanded: false,
      desc: txRow.desc,
    },
    time: new Date(tx.timestamp.toNumber()).toLocaleString(),
    address: incoming ? tx.from.toWif() : tx.to.toWif(),
    incoming,
    amount: tx.amount.toString(false),
  };
}
