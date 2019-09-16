<template>
  <StartArea :bottom-buttons="bottomBtns" header-msg="Welcome to GODcoin">
    <div class="form">
      <PasswordInput placeholder="Choose your password" v-model="passwords.initial" />
      <PasswordInput placeholder="Confirm password" v-model="passwords.confirm" />
      <div style="text-align: center; user-select: none">
        <span>{{ helpMsg }}</span>
      </div>
    </div>
  </StartArea>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import PasswordInput from '@/components/PasswordInput.vue';
import StartArea from '@/components/StartArea.vue';

@Component({
  components: {
    PasswordInput,
    StartArea,
  },
})
export default class CreateWallet1 extends Vue {
  private bottomBtns = [
    {
      icon: 'fa-history',
      link: '/restore-wallet',
      text: 'Restore',
      disabled: false,
    },
    {
      icon: 'fa-arrow-circle-right',
      link: '/create-wallet-2',
      text: 'Next',
      disabled: true,
    },
  ];

  private helpMsgs = {
    emptyForm: "Let's start creating your wallet by typing your password.",
    passMismatch: "Those passwords don't match. Please try again.",
    ready: 'Click the arrow or press "ENTER" to continue.',
  };
  private helpMsg = this.helpMsgs.emptyForm;

  private ready = false;
  private passMismatchTimeout: NodeJS.Timeout | null = null;
  private passwords = {
    initial: '',
    confirm: '',
  };

  @Watch('passwords', { deep: true })
  private onPropertyChanged(value: { initial: string; confirm: string }) {
    this.ready = false;
    if (this.passMismatchTimeout) {
      clearTimeout(this.passMismatchTimeout);
      this.passMismatchTimeout = null;
    }

    const { initial, confirm } = value;
    if (initial && confirm) {
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
  private onReadyChange(newReadyVal: boolean) {
    const nextBtn = this.bottomBtns[1];
    if (nextBtn.link !== '/create-wallet-2') {
      throw new Error('expected to disable the "next" button');
    }
    nextBtn.disabled = !newReadyVal;
  }
}
</script>

<style lang="scss" scoped>
.welcome-header {
  color: hsla(0, 0, 100%, 0.9);
  text-align: center;
  padding-top: 1.12em;
  font-size: 1.25em;
  font-weight: 900;
  user-select: none;
}

.form {
  margin-top: 60px;
  color: hsla(0, 0, 100%, 0.55);

  & > * {
    margin-bottom: 35px;
  }
}
</style>
