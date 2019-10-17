<template>
  <StartArea :bottom-buttons="bottomBtns" header-msg="Welcome back" @bottom-button-click="onButtonClick">
    <div class="form">
      <PasswordInput v-model="password" placeholder="Type your password" @keyup.native.enter="attemptLogin" />
      <div style="text-align: center; user-select: none">
        <span>{{ helpMsg }}</span>
      </div>
    </div>
  </StartArea>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import StartArea, { Button, ButtonClickEvent } from '@/components/StartArea.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { RootStore } from '@/store';
import ipc from '@/renderer/ipc';
import { Logger } from '@/log';

const log = new Logger('welcome');

@Component({
  components: {
    PasswordInput,
    StartArea,
  },
})
export default class Welcome extends Vue {
  private readonly dashboardPage = '/wallet/dashboard';
  private bottomBtns: Button[] = [
    {
      icon: 'fa-history',
      link: '/start/restore-wallet-1',
      text: 'Restore',
      disabled: false,
    },
    {
      icon: 'fa-arrow-circle-right',
      link: this.dashboardPage,
      text: 'Next',
      disabled: true,
    },
  ];

  private password: string = '';
  private isLoggingIn: boolean = false;
  private isReady: boolean = false;

  private helpMsgs = {
    emptyForm: 'Unlock your wallet by typing your password',
    ready: 'Click the arrow or press "ENTER" to continue.',
    incorrectPassword: 'Incorrect password, please try again.',
  };
  private helpMsg: string = this.helpMsgs.emptyForm;
  private helpUpdateTimer: NodeJS.Timer | null = null;

  @Watch('password')
  private onPasswordChange(newPassVal: string): void {
    if (this.helpUpdateTimer) {
      clearTimeout(this.helpUpdateTimer);
      this.helpUpdateTimer = null;
    }

    this.isReady = !!newPassVal && newPassVal.length > 0;
    this.helpUpdateTimer = setTimeout(() => {
      this.helpMsg = this.isReady ? this.helpMsgs.ready : this.helpMsgs.emptyForm;
      this.helpUpdateTimer = null;
    }, 200);
  }

  @Watch('isReady')
  private onReadyChange(newReadyVal: boolean): void {
    const btn = this.bottomBtns[1];
    if (btn.link !== this.dashboardPage) {
      throw new Error('expected page link ' + this.dashboardPage + ' got ' + btn.link);
    }
    btn.disabled = !newReadyVal;
  }

  private onButtonClick(evt: ButtonClickEvent): void {
    if (evt.target.link !== this.dashboardPage) return;
    evt.canceled = true;
    this.attemptLogin();
  }

  private attemptLogin(): void {
    if (this.isLoggingIn) return;
    this.isLoggingIn = true;
    (async (): Promise<void> => {
      if (this.helpUpdateTimer) {
        clearTimeout(this.helpUpdateTimer);
        this.helpUpdateTimer = null;
      }
      try {
        if (!this.isReady) return;
        const password = this.password;
        const ipcRes = await ipc.send({
          type: 'settings:init_wallet',
          password,
        });
        if (ipcRes.type !== 'settings:init_wallet') {
          throw new Error('Unexpected IPC response: ' + JSON.stringify(ipcRes));
        }
        const status = ipcRes.status;
        switch (status) {
          case 'success':
            RootStore.reset();
            this.$router.push(this.dashboardPage);
            break;
          case 'incorrect_password':
            this.helpMsg = this.helpMsgs.incorrectPassword;
            this.isReady = false;
            break;
          case 'invalid_checksum':
            this.helpMsg = 'Data corruption detected. Try restoring your wallet.';
            this.isReady = false;
            break;
          case 'no_settings_available':
            this.helpMsg = 'Unable to locate settings file. Try restoring your wallet.';
            this.isReady = false;
            break;
          case 'unknown':
            this.helpMsg = 'Unknown error occurred.';
            this.isReady = false;
            break;
          default: {
            const _exhaustiveCheck: never = status;
            throw new Error('invalid state:' + _exhaustiveCheck);
          }
        }
      } catch (e) {
        log.error('Failed to load settings:', e);
      } finally {
        this.isLoggingIn = false;
      }
    })();
  }
}
</script>

<style lang="scss" scoped>
.form {
  color: hsla(0, 0, 100%, 0.55);
  padding-top: 2em;

  & > * {
    margin-bottom: 35px;
  }
}
</style>
