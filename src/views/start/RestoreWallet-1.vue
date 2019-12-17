<template>
  <Start :bottom-buttons="bottomBtns" header-msg="GODcoin Wallet Recovery">
    <div class="form">
      <PasswordInput v-model="passwords.initial" placeholder="Choose your password" />
      <PasswordInput v-model="passwords.confirm" placeholder="Confirm password" @keyup.native.enter="onConfirmEnter" />
      <div style="text-align: center; user-select: none">
        <div v-for="(msg, index) in helpMsg.split('\n')" :key="index">{{ msg }}</div>
      </div>
    </div>
  </Start>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import Start, { StartBtn } from '@/components/win-area/Start.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { RootStore } from '@/store';

@Component({
  components: {
    PasswordInput,
    Start,
  },
})
export default class extends Vue {
  private readonly nextStepPage = '/start/restore-wallet-2';

  private bottomBtns: StartBtn[] = [
    {
      icon: 'fa-arrow-circle-left',
      go: -1,
      text: 'Go back',
      disabled: false,
    },
    {
      icon: 'fa-arrow-circle-right',
      link: this.nextStepPage,
      text: 'Next',
      disabled: true,
    },
  ];

  private helpMsgs = {
    emptyForm:
      "Let's start restoring your wallet by typing your password.\n" +
      'Do not share your password, anyone with your password can access your funds.',
    passMismatch: "Those passwords don't match. Please try again.",
    ready:
      'Click the arrow or press "ENTER" to continue.\n' +
      'Press the restore button to recover a previously existing wallet.',
  };
  private helpMsg = this.helpMsgs.emptyForm;

  private ready = false;
  private passMismatchTimeout: NodeJS.Timeout | null = null;
  private passwords = {
    initial: '',
    confirm: '',
  };

  private onConfirmEnter(evt: any): void {
    if (this.ready) {
      this.$router.push(this.nextStepPage);
    }
  }

  /* Vue lifecycle hook */
  private beforeMount(): void {
    const pass = RootStore.password;
    if (pass !== null) {
      this.passwords = {
        initial: pass,
        confirm: pass,
      };
    }
  }

  /* Vue lifecycle hook */
  private beforeDestroy(): void {
    if (this.ready) {
      RootStore.setPassword(this.passwords.confirm);
    }
  }

  @Watch('passwords', { deep: true })
  private onPropertyChanged(value: { initial: string; confirm: string }): void {
    this.ready = false;
    if (this.passMismatchTimeout) {
      clearTimeout(this.passMismatchTimeout);
      this.passMismatchTimeout = null;
    }

    const { initial, confirm } = value;
    if (initial && initial.length > 0 && confirm && confirm.length > 0) {
      // Both passwords supplied
      if (initial === confirm) {
        this.helpMsg = this.helpMsgs.ready;
        this.ready = true;
      } else {
        this.passMismatchTimeout = setTimeout(() => {
          this.helpMsg = this.helpMsgs.passMismatch;
          this.passMismatchTimeout = null;
        }, 250);
      }
    } else {
      this.helpMsg = this.helpMsgs.emptyForm;
    }
  }

  @Watch('ready')
  private onReadyChange(newReadyVal: boolean): void {
    const nextBtn = this.bottomBtns[1];
    if (nextBtn.link !== this.nextStepPage) {
      throw new Error('expected page link ' + this.nextStepPage + ' got ' + nextBtn.link);
    }

    nextBtn.disabled = !newReadyVal;
  }
}
</script>

<style lang="scss" scoped>
.form {
  color: hsla(0, 0, 100%, 0.55);

  & > * {
    margin-bottom: 35px;
  }
}
</style>
