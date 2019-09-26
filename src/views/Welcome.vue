<template>
  <div v-if="!isNew">
    <StartArea :bottom-buttons="bottomBtns" @bottom-button-click="onButtonClick" header-msg="Welcome back">
      <div class="form">
        <PasswordInput placeholder="Type your password" v-model="password" @keyup.native.enter="attemptLogin" />
        <div style="text-align: center; user-select: none">
          <!-- SECURITY: Use only hardcoded trusted inputs (XSS prone) -->
          <span v-html="helpMsg"></span>
        </div>
      </div>
    </StartArea>
  </div>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import StartArea, { Button, ButtonClickEvent } from '@/components/StartArea.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import ipc from '@/renderer/ipc';
import { Logger } from '@/log';
import { LoadSettingsRes } from '../ipc-models';

const log = new Logger('welcome');

@Component({
  components: {
    PasswordInput,
    StartArea,
  },
})
export default class Welcome extends Vue {
  private readonly dashboardPage = '/dashboard';
  private bottomBtns: Button[] = [
    {
      icon: 'fa-history',
      link: '/restore-wallet',
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

  // Flag used to determine whether to render any html to the page that is triggered from an async function inside
  // of the beforeMount hook
  private isNew = true;

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

  /* Vue lifecycle hook */
  private beforeMount(): void {
    (async () => {
      try {
        const ipcRes = await ipc.send({
          type: 'settings:does_exist',
        });
        if (ipcRes.type !== 'settings:does_exist') {
          throw new Error('invalid response type: ' + JSON.stringify(ipcRes));
        }

        this.isNew = !ipcRes.exists;
        if (this.isNew) {
          this.$router.push('/create-wallet-1');
        }
      } catch (e) {
        log.error('Failed to init welcome page properly:', e);
      }
    })();
  }

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
  private onReadyChange(newReadyVal: boolean) {
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
    (async () => {
      if (this.helpUpdateTimer) {
        clearTimeout(this.helpUpdateTimer);
        this.helpUpdateTimer = null;
      }
      try {
        if (!this.isReady) return;
        const password = this.password;
        const ipcRes = await ipc.send({
          type: 'settings:load_settings',
          password,
        });
        if (ipcRes.type !== 'settings:load_settings') {
          throw new Error('Unexpected IPC response: ' + JSON.stringify(ipcRes));
        }
        const status = ipcRes.status;
        switch (status) {
          case 'success':
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
