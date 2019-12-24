<template>
  <Dialog class="dialog-receive-funds" width="70%" :value="value" @input="$emit('input', $event)">
    <div style="user-select: none; filter: brightness(0.85); padding-bottom: 0.8em;">
      <img src="../../assets/coin-front.png" width="80" />
    </div>
    <div class="header">Your Regius Mark Address</div>
    <div class="address">
      <span>{{ p2shAddress ? p2shAddress.toWif() : '' }}</span>
    </div>
    <div class="actions">
      <Btn @click="$emit('input', false)">Close</Btn>
    </div>
  </Dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Dialog from '@/components/Dialog.vue';
import Btn from '@/components/Btn.vue';
import { ScriptHash } from 'regiusmark';
import { State } from 'vuex-class';

@Component({
  components: {
    Dialog,
    Btn,
  },
})
export default class extends Vue {
  @Prop({ default: () => false })
  private value!: boolean;

  @State(state => state.wallet.p2shAddr)
  private p2shAddress!: ScriptHash;
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
