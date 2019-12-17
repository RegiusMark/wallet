<template>
  <Dialog
    class="dialog-tx-in-progress"
    width="25%"
    :disable-esc="true"
    :value="value.active"
    @input="dialogActiveChange"
  >
    <div v-if="value.state === TransferState.Success">
      <div class="icon success">
        <i class="fas fa-check"></i>
      </div>
      <div class="msg-header">Sent!</div>
    </div>
    <div v-else-if="value.state === TransferState.Pending">
      <div class="icon pending">
        <i class="fas fa-sync-alt"></i>
      </div>
      <div class="msg-header">Pending...</div>
    </div>
    <div v-else-if="value.state === TransferState.Error">
      <div class="icon error">
        <i class="fas fa-times"></i>
      </div>
      <div class="msg-header">Broadcast error</div>
      <div class="msg">{{ value.msg }}</div>
    </div>
    <div v-else>
      <div class="icon error">
        <i class="fas fa-times"></i>
      </div>
      <div class="msg-header">Unknown transfer state</div>
    </div>
  </Dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { TxInProgressModel } from './TxInProgress-model';
import { TransferState } from './transfer-state';
import Dialog from '@/components/Dialog.vue';

@Component({
  components: {
    Dialog,
  },
})
export default class extends Vue {
  // Allow referencing in the template
  private readonly TransferState = TransferState;

  @Prop({
    default: (): TxInProgressModel => ({
      active: false,
      state: TransferState.Pending,
      msg: '',
    }),
  })
  private readonly value!: TxInProgressModel;

  private dialogActiveChange(active: boolean): void {
    const changes = {
      active,
    } as TxInProgressModel;
    this.$emit('input', Object.assign({}, this.value, changes));
  }
}
</script>

<style lang="scss" scoped>
.dialog-tx-in-progress {
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
</style>
