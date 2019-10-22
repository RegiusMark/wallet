<template>
  <div style="height: 100%;">
    <Dialog class="dialog-send-funds" v-model="dialogs.sendFunds.active">
      <div style="text-align: center;">
        <div style="user-select: none; filter: brightness(0.85)">
          <img src="../../assets/coin-front.png" width="80" />
        </div>
        <div class="funds" style="margin-top: 1em; font-size: 0.6em;">
          <div style="font-size: 1.5em; user-select: none;">Available</div>
          <span class="amount">{{ totalBal.toString() }}</span>
        </div>
        <div class="text-inputs">
          <TextInput icon="fa-address-card" placeholder="Send to GODcoin address..." />
          <TextInput icon="fa-coins" placeholder="Amount to send..." />
        </div>
        <div style="padding-bottom: 2em; height: 0.1px"></div>
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
          <Btn @click="sendBtnClick">Send</Btn>
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
import { Component, Vue } from 'vue-property-decorator';
import { DisplayableTx } from '@/store/wallet';
import TextInput from '@/components/TextInput.vue';
import DashArea from '@/components/DashArea.vue';
import { generateKeyPair, Asset } from 'godcoin';
import Dialog from '@/components/Dialog.vue';
import { TxRow } from '@/background/db';
import Btn from '@/components/Btn.vue';
import { WalletStore } from '@/store';
import { State } from 'vuex-class';
import ipc from '@/renderer/ipc';
import { Logger } from '@/log';

const log = new Logger('renderer:dashboard');

interface DialogData {
  active: boolean;
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
  private dialogs: { sendFunds: DialogData } = {
    sendFunds: {
      active: false,
    },
  };

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
          publicKey: ipcRes.publicKey,
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
    WalletStore.setExpandState({
      index,
      expanded: !tx.meta.expanded,
    });
  }

  private sendBtnClick(): void {
    this.dialogs.sendFunds.active = true;
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
}
</style>
