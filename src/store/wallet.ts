import { Module, Mutation, VuexModule } from 'vuex-module-decorators';
import { PublicKey, ScriptHash, TransferTxV0 } from 'godcoin';
import { TxRow } from '@/background/db';

export interface DisplayableTx {
  /* DB row ID */
  id: number;
  /* Formatted Date string */
  time: string;
  /* Public key WIF */
  to: string;
  incoming: boolean;
  /* Asset number as string without ticker */
  amount: string;
  /* Whether or not the description is expanded */
  expanded: boolean;
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

  @Mutation
  public setInitialized(initialized: boolean): void {
    this.initialized = initialized;
  }

  @Mutation
  public setData(data: { txs: TxRow[]; publicKey: PublicKey }): void {
    this.publicKey = data.publicKey;
    this.p2shAddr = data.publicKey.toScript().hash();

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
  public insertTx(tx: TxRow): void {
    const dtx = toDisplayableTx(this.p2shAddr!, tx);
    if (dtx) {
      this.txs.push(dtx);
    }
  }

  @Mutation
  public setExpandState(data: UpdateExpandState): void {
    this.txs[data.index].expanded = data.expanded;
  }
}

function toDisplayableTx(addr: ScriptHash, txRow: TxRow): DisplayableTx | undefined {
  const tx = txRow.tx.tx;
  if (!(tx instanceof TransferTxV0)) return;
  return {
    id: txRow.id,
    time: new Date(tx.timestamp.toNumber()).toLocaleString(),
    to: tx.to.toWif(),
    incoming: Buffer.compare(tx.to.bytes, addr.bytes) === 0,
    amount: tx.amount.toString(false),
    expanded: false,
  };
}
