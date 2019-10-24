<template>
  <div style="height: 100%;">
    <Dialog class="dialog-send-funds" width="70%" v-model="dialogs.sendFunds.active">
      <div style="text-align: center;">
        <div style="user-select: none; filter: brightness(0.85)">
          <img src="../../assets/coin-front.png" width="80" />
        </div>
        <div class="funds" style="margin-top: 1em; font-size: 0.6em;">
          <div style="font-size: 1.5em; user-select: none;">Available</div>
          <span class="amount">{{ totalBal.toString() }}</span>
        </div>
        <div class="text-inputs">
          <TextInput
            icon="fa-address-card"
            v-model="dialogs.sendFunds.form.address"
            placeholder="Send to GODcoin address..."
          />
          <TextInput icon="fa-coins" v-model="dialogs.sendFunds.form.amount" placeholder="Amount to send..." />
        </div>
        <div class="error-msg">{{ dialogs.sendFunds.form.error }}</div>
        <div class="balances">
          <div>Fee: {{ sendDialogFee }}</div>
          <div>Remaining: {{ sendDialogRemaining }}</div>
        </div>
        <div class="actions">
          <Btn @click="transferFunds" :disabled="!sendBtnEnabled">Send</Btn>
          <Btn @click="sendDialogActive(false)">Cancel</Btn>
        </div>
      </div>
    </Dialog>
    <Dialog width="25%" v-model="dialogs.transferredFunds.active" class="dialog-transferred-funds" :disable-esc="true">
      <div v-if="dialogs.transferredFunds.state === TransferState.Success">
        <div class="icon success">
          <i class="fas fa-check"></i>
        </div>
        <div class="msg">Sent!</div>
      </div>
      <div v-else-if="dialogs.transferredFunds.state === TransferState.Pending">
        <div class="icon pending">
          <i class="fas fa-sync-alt"></i>
        </div>
        <div class="msg">Pending...</div>
      </div>
      <div v-else-if="dialogs.transferredFunds.state === TransferState.Error">
        <div class="icon error">
          <i class="fas fa-times"></i>
        </div>
        <div class="msg">Broadcast error</div>
      </div>
      <div v-else>
        <div class="icon error">
          <i class="fas fa-times"></i>
        </div>
        <div class="msg">Unknown transfer state</div>
      </div>
    </Dialog>
    <DashArea>
      <div class="container">
        <div style="margin-top: 0.85em; user-select: none; filter: brightness(0.85)">
          <img src="../../assets/coin-front.png" width="120" />
        </div>
        <div class="funds">
          <span class="amount">{{ totalBal.toString(false) }}</span>
          <span>GRAEL</span>
        </div>
        <div class="actions">
          <Btn @click="sendDialogActive(true)">Send</Btn>
          <Btn>Receive</Btn>
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
                <div>Date: {{ tx.time }}</div>
              </div>
              <div class="tx-separator" style="width: 100%;" />
            </div>
          </div>
        </div>
      </div>
    </DashArea>
  </div>
</template>

<script lang="ts">
import { generateKeyPair, Asset, ScriptHash, ASSET_SYMBOL } from 'godcoin';
import { Component, Watch, Vue } from 'vue-property-decorator';
import TextInput from '@/components/TextInput.vue';
import DashArea from '@/components/DashArea.vue';
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

enum TransferState {
  Success,
  Pending,
  Error,
}

interface SendFundsForm {
  address: string;
  amount: string;
  error: string | null;
}

interface SendFundsDialog {
  active: boolean;
  interval: NodeJS.Timer | null;
  fee: Asset | null;
  formValid: boolean;
  form: SendFundsForm;
}

interface TransferredFundsDialog {
  active: boolean;
  state: TransferState;
}

interface Dialogs {
  sendFunds: SendFundsDialog;
  transferredFunds: TransferredFundsDialog;
}

@Component({
  components: {
    TextInput,
    DashArea,
    Dialog,
    Btn,
  },
})
export default class Dashboard extends Vue {
  // Allow referencing in the template
  private readonly TransferState = TransferState;

  private dialogs: Dialogs = {
    sendFunds: {
      active: false,
      interval: null,
      fee: null,
      formValid: false,
      form: {
        address: '',
        amount: '',
        error: null,
      },
    },
    transferredFunds: {
      active: false,
      state: TransferState.Pending,
    },
  };

  private get sendDialogFee(): string {
    const fee = this.dialogs.sendFunds.fee;
    return fee ? fee.toString(false) : 'Determining...';
  }

  private get sendDialogRemaining(): string {
    const fee = this.dialogs.sendFunds.fee;
    if (!(fee && this.dialogs.sendFunds.formValid)) return 'Determining...';
    const amt = Asset.fromString(this.dialogs.sendFunds.form.amount.trim() + ' ' + ASSET_SYMBOL);
    if (amt.amount.lt(0)) return 'Amount cannot be negative.';
    return this.totalBal
      .sub(amt)
      .sub(fee)
      .toString(false);
  }

  private get sendBtnEnabled(): boolean {
    const dialog = this.dialogs.sendFunds;
    if (!dialog.formValid) return false;
    const amt = Asset.fromString(dialog.form.amount.trim() + ' ' + ASSET_SYMBOL);
    return dialog.fee !== null && amt.amount.gt(0);
  }

  @State(state => state.wallet.syncStatus)
  private syncStatus!: SyncStatus;

  @State(state => state.wallet.txs)
  private txs!: DisplayableTx[];

  @State(state => state.wallet.totalBal)
  private totalBal!: Asset;

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

  /* Vue lifecycle hook */
  private beforeDestroy(): void {
    if (this.dialogs.sendFunds.interval) {
      clearInterval(this.dialogs.sendFunds.interval);
      this.dialogs.sendFunds.interval = null;
    }
  }

  private txClick(index: number, tx: DisplayableTx): void {
    WalletStore.setExpandState({
      index,
      expanded: !tx.meta.expanded,
    });
  }

  private sendDialogActive(active: boolean): void {
    const dialog = this.dialogs.sendFunds;
    dialog.active = active;
    if (dialog.interval) {
      clearInterval(dialog.interval);
      dialog.interval = null;
    }
    if (active) {
      // Reset the form fields
      dialog.formValid = false;
      dialog.form.address = '';
      dialog.form.amount = '0.00000';
      dialog.fee = null;

      this.updateFee();
      dialog.interval = setInterval(async () => {
        await this.updateFee();
      }, 5000);
    }
  }

  @Watch('dialogs.sendFunds.form', { deep: true })
  private sendFundsFormChange(form: SendFundsForm): void {
    this.dialogs.sendFunds.formValid = false;
    const fee = this.dialogs.sendFunds.fee;
    const addr = form.address.trim();
    const amt = form.amount.trim();

    try {
      if (addr.length > 0) {
        ScriptHash.fromWif(form.address);
      }
    } catch (e) {
      log.error('Error parsing address:', form.address, e.message);
      this.dialogs.sendFunds.form.error = 'Invalid address.';
      return;
    }

    try {
      if (amt.length > 0) {
        const sendAmtAsset = Asset.fromString(amt + ' ' + ASSET_SYMBOL);
        if (
          fee &&
          WalletStore.totalBal
            .sub(sendAmtAsset)
            .sub(fee)
            .lt(new Asset(Big(0)))
        ) {
          this.dialogs.sendFunds.form.error = 'Insufficient funds.';
          return;
        }
      }
    } catch (e) {
      log.error('Error parsing asset:', form.amount, e.message);
      this.dialogs.sendFunds.form.error = 'Invalid amount.';
      return;
    }

    if (addr.length > 0 && amt.length > 0) {
      this.dialogs.sendFunds.formValid = true;
    }
    this.dialogs.sendFunds.form.error = null;
  }

  @Watch('syncStatus')
  private syncStatusChange(status: SyncStatus): void {
    this.updateFee();
  }

  private async updateFee(): Promise<void> {
    if (this.syncStatus === SyncStatus.Connecting) {
      // Go back to determination state until it's guaranteed to get a fee update.
      this.dialogs.sendFunds.fee = null;
      return;
    }
    try {
      const fee = await ipc.getFee();
      if (fee.error) {
        log.error('IPC returned error getting fee:', fee.error);
        this.dialogs.sendFunds.fee = null;
        return;
      }
      const fees = fee.data!;
      this.dialogs.sendFunds.fee = fees.netFee.add(fees.addrFee);
    } catch (e) {
      this.dialogs.sendFunds.fee = null;
      log.error('Failed to update fee information:', e);
    }
  }

  private transferFunds(): void {
    const sendFundsDialog = this.dialogs.sendFunds;
    if (!sendFundsDialog.formValid) return;
    try {
      const addr = ScriptHash.fromWif(sendFundsDialog.form.address.trim());
      const amount = Asset.fromString(sendFundsDialog.form.amount.trim() + ' ' + ASSET_SYMBOL);

      const dialog = this.dialogs.transferredFunds;
      dialog.state = TransferState.Pending;
      dialog.active = true;

      setTimeout(() => {
        dialog.state = TransferState.Success;

        setTimeout(() => {
          sendFundsDialog.active = false;
          dialog.active = false;
        }, 2000);
      }, 1000);
      // TODO broadcast to the blockchain
    } catch (e) {
      log.error('Failed to send funds:', e);
    }
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

  .history > div {
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
      }
    }

    &:hover {
      background-color: $bg-color;
    }
  }
}

.dialog-send-funds {
  .funds > *:first-child {
    color: hsla(55, 83, 70, 0.8);
  }

  .text-inputs > * {
    margin-top: 1.5em;
  }

  .error-msg {
    margin-top: 2em;
    height: 1.2em;

    font-size: 1.1em;
    color: hsla(0, 100, 50, 0.8);
  }

  .balances {
    text-align: left;
    color: hsla(0, 0, 100, 0.4);
  }

  .actions {
    margin-top: 1em;

    & > * {
      padding: 0.2em 0.2em;
    }
  }
}

.dialog-transferred-funds {
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

  .msg {
    margin-top: 1em;
    font-size: 1.4em;
  }
}
</style>
