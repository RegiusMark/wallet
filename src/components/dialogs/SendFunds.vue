<template>
  <Dialog class="dialog-send-funds" width="70%" :value="value" @input="$emit('input', $event)">
    <div style="text-align: center;">
      <div style="user-select: none; filter: brightness(0.85)">
        <img src="../../assets/coin-front.png" width="80" />
      </div>
      <div class="funds" style="margin-top: 1em; font-size: 0.6em;">
        <div style="font-size: 1.5em; user-select: none;">Available</div>
        <span class="amount">{{ totalBal.toString() }}</span>
      </div>
      <div class="text-inputs">
        <TextInput icon="fa-address-card" v-model.trim="form.address" placeholder="Send to GODcoin address..." />
        <TextInput icon="fa-coins" v-model.trim="form.amount" placeholder="Amount to send..." />
        <TextInput icon="fa-sticky-note" v-model.trim="form.memo" placeholder="Optional public memo..." />
      </div>
      <div class="error-msg">{{ form.error }}</div>
      <div class="balances">
        <div>Fee: {{ displayableFee }}</div>
        <div>Remaining: {{ displayableRemaining }}</div>
      </div>
      <div class="actions">
        <Btn @click="transferFunds" :disabled="!sendBtnEnabled">Send</Btn>
        <Btn @click="$emit('input', false)">Cancel</Btn>
      </div>
    </div>
  </Dialog>
</template>

<script lang="ts">
import { Asset, ScriptHash, ASSET_SYMBOL, MAX_MEMO_BYTE_SIZE } from 'godcoin';
import { Component, Watch, Prop, Vue } from 'vue-property-decorator';
import TextInput from '@/components/TextInput.vue';
import { TransferState } from './transfer-state';
import Dialog from '@/components/Dialog.vue';
import { SyncStatus } from '@/ipc-models';
import Btn from '@/components/Btn.vue';
import { WalletStore } from '@/store';
import { State } from 'vuex-class';
import ipc from '@/renderer/ipc';
import { Logger } from '@/log';
import Big from 'big.js';

const log = new Logger('renderer:send-funds');

interface SendFundsForm {
  address: string;
  amount: string;
  memo: string;
  error: string | null;
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
    TextInput,
    Dialog,
    Btn,
  },
})
export default class extends Vue {
  @Prop({ default: () => false })
  private readonly value!: boolean;

  updateFeeInterval: NodeJS.Timer | null = null;
  fee: Asset | null = null;
  formValid = false;

  private form: SendFundsForm = {
    address: '',
    amount: '0.00000',
    memo: '',
    error: null,
  };

  private get displayableFee(): string {
    const fee = this.fee;
    return fee ? fee.toString(false) : 'Determining...';
  }

  private get displayableRemaining(): string {
    const fee = this.fee;
    if (!(fee && this.formValid)) return 'Determining...';
    const amt = parseAmount(this.form.amount);
    if (amt.amount.lt(0)) return 'Amount cannot be negative.';
    return this.totalBal
      .sub(amt)
      .sub(fee)
      .toString(false);
  }

  private get sendBtnEnabled(): boolean {
    if (!this.formValid) return false;
    const amt = parseAmount(this.form.amount);
    return this.fee !== null && amt.amount.gt(0);
  }

  @State(state => state.wallet.syncStatus)
  private syncStatus!: SyncStatus;

  @State(state => state.wallet.totalBal)
  private totalBal!: Asset;

  @Watch('value')
  private onActiveChange(value: boolean): void {
    if (value) {
      this.formValid = false;
      this.form.address = '';
      this.form.amount = '0.00000';
      this.form.memo = '';
      this.fee = null;

      this.updateFee();
      this.updateFeeInterval = setInterval(async () => {
        await this.updateFee();
      }, 5000);
    } else {
      if (this.updateFeeInterval) {
        clearInterval(this.updateFeeInterval);
        this.updateFeeInterval = null;
      }
    }
  }

  @Watch('form', { deep: true })
  private sendFundsFormChange(form: SendFundsForm): void {
    this.formValid = false;
    const addr = form.address;
    const amt = form.amount;

    try {
      if (addr.length > 0) {
        parseAddress(addr);
      }
    } catch (e) {
      log.error('Error parsing address:', addr, e.message);
      form.error = 'Invalid address.';
      return;
    }

    try {
      if (amt.length > 0) {
        const sendAmtAsset = parseAmount(amt);
        const fee = this.fee;
        if (
          fee &&
          WalletStore.totalBal
            .sub(sendAmtAsset)
            .sub(fee)
            .lt(new Asset(Big(0)))
        ) {
          form.error = 'Insufficient funds.';
          return;
        }
      }
    } catch (e) {
      log.error('Error parsing asset:', form.amount, e.message);
      form.error = 'Invalid amount.';
      return;
    }

    {
      const buf = new TextEncoder().encode(form.memo);
      if (buf.length > MAX_MEMO_BYTE_SIZE) {
        form.error = 'Memo exceeds the maximum allowed size.';
        return;
      }
    }

    if (addr.length > 0 && amt.length > 0) {
      this.formValid = true;
    }
    this.form.error = null;
  }

  @Watch('syncStatus')
  private syncStatusChange(status: SyncStatus): void {
    this.updateFee();
  }

  private async updateFee(): Promise<void> {
    if (this.syncStatus === SyncStatus.Connecting) {
      // Go back to determination state until it's guaranteed to get a fee update.
      this.fee = null;
      return;
    }
    try {
      const fee = await ipc.getFee();
      if (fee.error) {
        log.error('IPC returned error getting fee:', fee.error);
        this.fee = null;
        return;
      }
      const fees = fee.data!;
      this.fee = fees.netFee.add(fees.addrFee);
    } catch (e) {
      this.fee = null;
      log.error('Failed to update fee information:', e);
    }
  }

  private async transferFunds(): Promise<void> {
    if (!this.sendBtnEnabled) return;
    try {
      this.$emit('transfer-status', TransferState.Pending);

      const addr = parseAddress(this.form.address);
      const amount = parseAmount(this.form.amount);
      const memo = new TextEncoder().encode(this.form.memo);
      const fee = this.fee!;

      const res = await ipc.transferFunds({
        toAddress: addr,
        amount,
        fee,
        memo,
      });

      if (res.error) throw new Error(res.error);
      this.$emit('transfer-status', TransferState.Success);
    } catch (e) {
      log.error('Failed to send funds:', e);
      this.$emit('transfer-status', TransferState.Error, e.message);
    }
  }
}
</script>

<style lang="scss" scoped>
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
</style>
