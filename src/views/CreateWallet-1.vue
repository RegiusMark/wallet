<template>
  <StartArea :bottom-buttons="bottomBtns" header-msg="Welcome to GODcoin">
    <div class="form">
      <PasswordInput v-model="passwords.initial" placeholder="Choose your password" />
      <PasswordInput v-model="passwords.confirm" placeholder="Confirm password" @keyup.native.enter="onConfirmEnter" />
      <div style="text-align: center; user-select: none">
        <!-- SECURITY: Use only hardcoded trusted inputs (XSS prone) -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="helpMsg"></span>
      </div>
    </div>
  </StartArea>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import PasswordInput from '@/components/PasswordInput.vue';
import StartArea, { Button } from '@/components/StartArea.vue';
import { RootStore } from '@/store';

@Component({
  components: {
    PasswordInput,
    StartArea,
  },
})
export default class CreateWallet1 extends Vue {
  private readonly restorePage = '/restore-wallet';
  private readonly nextStepPage = '/create-wallet-2';

  private bottomBtns: Button[] = [
    {
      icon: 'fa-history',
      link: this.restorePage,
      text: 'Restore',
      disabled: true,
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
      "Let's start creating or restoring your wallet by typing your password.<br />" +
      'Do not share your password, anyone with your password can access your funds.',
    passMismatch: "Those passwords don't match. Please try again.",
    ready:
      'Click the arrow or press "ENTER" to continue.<br />' +
      'Press the restore button to recover a previously existing wallet.',
  };
  /* SECURITY: Use only hardcoded trusted inputs (XSS prone) */
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
    if (initial && initial.length > 0 && (confirm && confirm.length > 0)) {
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
    const restoreBtn = this.bottomBtns[0];
    if (restoreBtn.link !== this.restorePage) {
      throw new Error('expected page link ' + this.nextStepPage + ' got ' + restoreBtn.link);
    }

    const nextBtn = this.bottomBtns[1];
    if (nextBtn.link !== this.nextStepPage) {
      throw new Error('expected page link ' + this.nextStepPage + ' got ' + nextBtn.link);
    }

    restoreBtn.disabled = !newReadyVal;
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
