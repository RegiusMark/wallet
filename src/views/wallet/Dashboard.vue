<template>
  <div style="height: 100%;">
    <SendFundsDialog v-model="dialogs.sendFunds.active" @transfer-status="sendFundsStatusUpdate" />
    <Dialog class="dialog-transfer-funds" width="25%" v-model="dialogs.transferFunds.active" :disable-esc="true">
      <div v-if="dialogs.transferFunds.state === TransferState.Success">
        <div class="icon success">
          <i class="fas fa-check"></i>
        </div>
        <div class="msg-header">Sent!</div>
      </div>
      <div v-else-if="dialogs.transferFunds.state === TransferState.Pending">
        <div class="icon pending">
          <i class="fas fa-sync-alt"></i>
        </div>
        <div class="msg-header">Pending...</div>
      </div>
      <div v-else-if="dialogs.transferFunds.state === TransferState.Error">
        <div class="icon error">
          <i class="fas fa-times"></i>
        </div>
        <div class="msg-header">Broadcast error</div>
        <div class="msg">{{ dialogs.transferFunds.msg }}</div>
      </div>
      <div v-else>
        <div class="icon error">
          <i class="fas fa-times"></i>
        </div>
        <div class="msg-header">Unknown transfer state</div>
      </div>
    </Dialog>
    <Dialog class="dialog-receive-funds" width="70%" v-model="dialogs.receiveFunds.active">
      <div style="user-select: none; filter: brightness(0.85); padding-bottom: 0.8em;">
        <img src="../../assets/coin-front.png" width="80" />
      </div>
      <div class="header">Your GODcoin Address</div>
      <div class="address">
        <span>{{ p2shAddress ? p2shAddress.toWif() : '' }}</span>
      </div>
      <div class="actions">
        <Btn @click="receiveDialogActive(false)">Close</Btn>
      </div>
    </Dialog>
    <Dashboard>
      <div class="container">
        <div style="margin-top: 0.85em; user-select: none; filter: brightness(0.85)">
          <img src="../../assets/coin-front.png" width="120" />
        </div>
        <div class="funds">
          <span class="amount">{{ totalBal.toString(false) }}</span>
          <span>{{ ASSET_SYMBOL }}</span>
        </div>
        <div class="actions">
          <Btn @click="openSendDialog">Send</Btn>
          <Btn @click="receiveDialogActive(true)">Receive</Btn>
        </div>
        <div class="container-separator"></div>
        <div class="transaction-history">
          <div class="info-header">
            <span v-if="txs.length <= 0">No transaction history</span>
            <span v-else>Transactions</span>
          </div>
          <div class="history">
            <div v-for="(tx, index) of txs" :key="tx.id" :class="{ expanded: tx.meta.expanded }">
              <div class="tx-header" :class="{ incoming: tx.incoming }" @click="txClick(index, tx)">
                <div v-if="tx.incoming">
                  <i class="fas fa-arrow-down left-icon"></i>
                  <span>Received</span>
                </div>
                <div v-else>
                  <i class="fas fa-arrow-up left-icon"></i>
                  <span>Sent</span>
                </div>
                <div>
                  <span>{{ tx.incoming ? '+ ' + tx.amount : tx.amount }}</span>
                  <i
                    class="fas fa-chevron-up right-icon"
                    :style="{ transform: tx.meta.expanded ? 'rotate(180deg)' : 'rotate(0deg)' }"
                  ></i>
                </div>
              </div>
              <div class="tx-body" v-if="tx.meta.expanded">
                <div>
                  <div>Date</div>
                  <div>{{ tx.time }}</div>
                </div>
                <div>
                  <div>{{ tx.incoming ? 'From' : 'To' }}</div>
                  <div>{{ tx.address }}</div>
                </div>
                <div v-if="!tx.incoming">
                  <div>Fee</div>
                  <div>{{ tx.fee }}</div>
                </div>
                <div>
                  <div>Memo</div>
                  <div v-if="tx.memo">{{ tx.memo }}</div>
                  <div v-else-if="!tx.hasMemo()" class="no-memo">This transaction has no memo</div>
                  <div v-else class="parse-memo">
                    Memo contains invalid characters, <span @click="tx.parseMemo(true)">click to display anyways</span>
                  </div>
                </div>
              </div>
              <div class="tx-separator" style="width: 100%;" />
            </div>
          </div>
        </div>
      </div>
    </Dashboard>
  </div>
</template>

<script lang="ts">
import { Asset, ScriptHash, ASSET_SYMBOL, MAX_MEMO_BYTE_SIZE } from 'godcoin';
import { SendFundsDialog, TransferState } from '@/components/dialogs';
import { Component, Watch, Vue } from 'vue-property-decorator';
import Dashboard from '@/components/win-area/Dashboard.vue';
import TextInput from '@/components/TextInput.vue';
import { DisplayableTx } from '@/store/wallet';
import Dialog from '@/components/Dialog.vue';
import { SyncStatus } from '@/ipc-models';
import { TxRow } from '@/background/db';
import Btn from '@/components/Btn.vue';
import { WalletStore } from '@/store';
import { State } from 'vuex-class';
import ipc from '@/renderer/ipc';
import { Logger } from '@/log';
import Big from 'big.js';

const log = new Logger('renderer:dashboard');

interface TransferFundsDialog {
  active: boolean;
  state: TransferState;
  msg: string;
}

interface Dialogs {
  sendFunds: {
    active: boolean;
  };
  transferFunds: TransferFundsDialog;
  receiveFunds: {
    active: boolean;
  };
}

function parseAddress(address: string): ScriptHash {
  address = address.trim();
  return ScriptHash.fromWif(address);
}

function parseAmount(amount: string): Asset {
  amount = amount.trim();
  const pos = amount.indexOf('.');
  const precision = 5;
  if (pos === -1) {
    amount += '.' + '0'.repeat(precision);
  } else {
    const missingPrec = precision - (amount.length - 1) + pos;
    if (missingPrec < 0) {
      throw new Error('precision too high');
    }
    amount += '0'.repeat(missingPrec);
  }
  return Asset.fromString(amount + ' ' + ASSET_SYMBOL);
}

@Component({
  components: {
    SendFundsDialog,
    Dashboard,
    TextInput,
    Dialog,
    Btn,
  },
})
export default class extends Vue {
  // Allow referencing in the template
  private readonly TransferState = TransferState;
  private readonly ASSET_SYMBOL = ASSET_SYMBOL;

  private dialogs: Dialogs = {
    sendFunds: {
      active: false,
    },
    transferFunds: {
      active: false,
      state: TransferState.Pending,
      msg: '',
    },
    receiveFunds: {
      active: false,
    },
  };

  @State(state => state.wallet.syncStatus)
  private syncStatus!: SyncStatus;

  @State(state => state.wallet.txs)
  private txs!: DisplayableTx[];

  @State(state => state.wallet.totalBal)
  private totalBal!: Asset;

  @State(state => state.wallet.p2shAddr)
  private p2shAddress!: ScriptHash;

  /* Vue lifecycle hook */
  private beforeMount(): void {
    if (WalletStore.initialized) return;
    WalletStore.setInitialized(true);
    (async (): Promise<void> => {
      try {
        const ipcRes = await ipc.postInit();
        WalletStore.setData({
          syncStatus: ipcRes.syncStatus,
          script: ipcRes.script,
          totalBal: ipcRes.totalBalance,
          txs: ipcRes.txs,
        });

        ipc.onSyncUpdate((update): void => {
          WalletStore.setSyncStatus(update.status);
          if (update.newData) {
            WalletStore.setTotalBalance(update.newData.totalBalance);
            WalletStore.insertTxs(update.newData.txs);
          }
        });
      } catch (e) {
        log.error('Error during post wallet initialization', e);
      }
    })();
  }

  private txClick(index: number, tx: DisplayableTx): void {
    if (tx.memo === null && tx.hasMemo()) {
      // Attempt to parse the memo initially, afterwards we ask the user if they want to display it anyways
      tx.parseMemo(false);
    }

    WalletStore.setExpandState({
      index,
      expanded: !tx.meta.expanded,
    });
  }

  private openSendDialog(): void {
    this.dialogs.sendFunds.active = true;
  }

  private sendFundsStatusUpdate(status: TransferState, msg?: string): void {
    const dialog = this.dialogs.transferFunds;
    dialog.state = status;
    dialog.msg = '';
    switch (status) {
      case TransferState.Pending:
        dialog.active = true;
        break;
      case TransferState.Success:
        setTimeout(() => {
          this.dialogs.sendFunds.active = false;
          dialog.active = false;
        }, 1500);
        break;
      case TransferState.Error:
        dialog.msg = msg!;
        setTimeout(() => {
          this.dialogs.sendFunds.active = false;
          dialog.active = false;
        }, 3000);
        break;
      default:
        const _exhaustiveCheck: never = status;
        throw new Error('exhaustive check failed: ' + _exhaustiveCheck);
    }
  }

  private receiveDialogActive(active: boolean): void {
    this.dialogs.receiveFunds.active = active;
  }
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;

  white-space: nowrap;

  .container-separator {
    width: 85%;
    margin-top: 1em;
    border-top: solid 2px hsla(0, 0, 100, 0.1);
  }

  & > div {
    flex: 1;
  }
}

.actions {
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;

  & > div {
    flex: 0 0 6em;
  }
}

.funds {
  margin-top: 0.3em;
  font-size: 1em;
  color: hsla(55, 83, 50, 1);

  .amount {
    padding-right: 0.3em;
    font-size: 2em;
  }
}

.transaction-history {
  margin-top: 1.2em;
  width: 90%;

  .info-header {
    margin-bottom: 1em;
    user-select: none;
    color: hsla(0, 0, 100, 0.5);
    text-align: center;
    font-size: 1.2em;
  }

  .history {
    margin-bottom: 4em;

    & > div {
      $bg-color: hsla(275, 50, 40, 0.2);

      .tx-header {
        display: flex;
        flex-flow: row nowrap;
        justify-content: space-between;
        user-select: none;
        cursor: pointer;
        padding: 1em;

        color: hsla(0, 0, 100, 0.8);

        &.incoming {
          color: hsla(0, 0, 100, 0.55);
        }

        .left-icon {
          margin-right: 10px;
          transform: rotate(45deg);
        }

        .right-icon {
          margin-left: 10px;
          transition: transform 200ms;
        }
      }

      .tx-separator {
        width: 85%;
        border-top: solid 2px hsla(0, 0, 100, 0.1);
      }

      &.expanded {
        background-color: $bg-color;

        .tx-body {
          padding: 0.8em 0.8em 0.8em 0.8em;
          background-color: darken($bg-color, 60%);
          font-size: 0.9em;

          & > div {
            margin-bottom: 0.5em;

            // Field name
            *:nth-child(1) {
              color: hsla(0, 0, 80, 0.4);
              margin-bottom: 3px;
            }

            // Value
            *:nth-child(2) {
              color: hsla(0, 0, 100, 0.65);
            }

            .no-memo {
              color: hsla(0, 0, 100, 0.5);
              font-style: oblique;
            }

            .parse-memo {
              color: hsla(0, 0, 100, 0.5);
              font-style: oblique;

              span {
                cursor: pointer;

                color: hsla(0, 0, 100, 0.5);
                text-decoration: underline;
              }
            }
          }
        }
      }

      &:hover {
        background-color: $bg-color;
      }
    }
  }
}

.dialog-transfer-funds {
  text-align: center;

  .icon {
    font-size: 3em;

    &.success i {
      color: hsla(123, 75, 50, 0.5);
    }

    &.pending i {
      color: hsla(55, 83, 45, 0.75);
      animation: fa-spin 2.5s ease-in-out infinite;
    }

    &.error i {
      color: hsla(0, 75, 50, 0.5);
    }
  }

  .msg-header {
    margin-top: 1em;
    font-size: 1.4em;
    color: hsla(0, 0, 100, 0.7);
  }

  .msg {
    margin-top: 1.5em;
    color: hsla(0, 0, 100, 0.55);
  }
}

.dialog-receive-funds {
  text-align: center;
  font-size: 1.1em;

  .header {
    user-select: none;
    color: hsla(0, 0, 100, 0.55);
  }

  .address {
    margin-top: 1em;
    font-size: 1.05em;

    & > :first-child {
      padding: 0.4em;
      background-color: hsla(0, 0, 40, 0.2);
      border-radius: 4px;
    }
  }

  .actions {
    padding-top: 2em;
    font-size: 0.7em;
  }
}
</style>
