<template>
  <DashArea>
    <div class="container">
      <div style="margin-top: 0.85em; user-select: none;">
        <img src="../../assets/coin-front.png" width="120" />
      </div>
      <div class="funds">
        <span class="amount">1.00000</span>
        <span>GRAEL</span>
      </div>
      <div class="actions">
        <div>Send</div>
        <div>Receive</div>
      </div>
      <div class="container-separator"></div>
      <div class="transaction-history">
        <div class="info-header">
          <span v-if="txs.length <= 0">No transaction history</span>
          <span v-else>Transactions</span>
        </div>
        <div class="history">
          <div v-for="tx of txs" :key="tx.time" :class="{ expanded: tx.expanded }">
            <div class="tx-header" :class="{ incoming: tx.incoming }" @click="txClick(tx)">
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
                  :style="{ transform: tx.expanded ? 'rotate(180deg)' : 'rotate(0deg)' }"
                ></i>
              </div>
            </div>
            <div class="tx-body" v-if="tx.expanded">
              <span>TODO</span>
            </div>
            <div class="tx-separator" style="width: 100%;" />
          </div>
        </div>
      </div>
    </div>
  </DashArea>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import DashArea from '@/components/DashArea.vue';
import { PublicKey, generateKeyPair, Asset } from 'godcoin';

export interface Transaction {
  time: Date;
  to: PublicKey;
  incoming: boolean;
  amount: Asset;
}

interface DisplayableTransaction {
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

@Component({
  components: {
    DashArea,
  },
})
export default class Dashboard extends Vue {
  private txs: DisplayableTransaction[] = [];

  /* Vue lifecycle hook */
  private beforeMount(): void {
    // Mock data
    const mock_txs: Transaction[] = [
      {
        time: new Date(0),
        to: generateKeyPair().publicKey,
        incoming: true,
        amount: Asset.fromString('2.00000 GRAEL'),
      },
      {
        time: new Date(1000),
        to: generateKeyPair().publicKey,
        incoming: false,
        amount: Asset.fromString('1.00000 GRAEL'),
      },
    ];

    this.txs = mock_txs
      .sort((a, b): number => {
        return b.time.getTime() - a.time.getTime();
      })
      .map(this.toDisplayableTransaction.bind(this));
  }

  private toDisplayableTransaction(tx: Transaction): DisplayableTransaction {
    return {
      time: tx.time.toLocaleString(),
      to: tx.to.toWif(),
      incoming: tx.incoming,
      amount: tx.amount.toString(false),
      expanded: false,
    };
  }

  private txClick(tx: DisplayableTransaction): void {
    tx.expanded = !tx.expanded;
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
    margin: 1em;
    padding: 0.4em 1em;
    background-color: hsla(275, 50, 40, 0.5);
    border: solid 2px hsla(275, 50, 40, 0.8);
    border-radius: 4px;

    color: hsla(0, 0, 100, 0.9);
    font-size: 1.15em;
    text-align: center;

    user-select: none;
    cursor: pointer;

    transition: background-color 250ms;

    &:hover {
      background-color: hsla(275, 50, 40, 0.8);
      border-color: hsla(275, 50, 40, 1);
    }
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
</style>
