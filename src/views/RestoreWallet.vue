<template>
  <StartArea header-msg="Restore wallet" @bottom-button-click="buttonClick" :bottom-buttons="bottomBtns">
    <div class="form">
      <PasswordInput placeholder="Enter private key" :mask-mode="MaskMode.None" v-model.trim="privateKey" />
      <div style="text-align: center;">
        <span>{{ helpMsg }}</span>
      </div>
    </div>
  </StartArea>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import { PrivateKey, KeyPair, InvalidWif } from 'godcoin';
import PasswordInput, { MaskMode } from '@/components/PasswordInput.vue';
import StartArea, { ButtonClickEvent } from '@/components/StartArea.vue';
import { RootStore } from '@/store';
import ipc from '@/renderer/ipc';
import { Logger } from '@/log';

const log = new Logger('restore-wallet');

@Component({
  components: {
    StartArea,
    PasswordInput,
  },
})
export default class RestoreWallet extends Vue {
  // Allow referencing in the template
  private MaskMode = MaskMode;

  private readonly dashboardPage = '/dashboard';
  private bottomBtns = [
    {
      icon: 'fa-arrow-circle-left',
      link: '/create-wallet-1',
      text: 'Go back',
      disabled: false,
    },
    {
      icon: 'fa-flag-checkered',
      link: this.dashboardPage,
      text: 'Finish',
      disabled: true,
    },
  ];

  private helpMsgs = {
    emptyForm: 'In order to restore your wallet, we need you to enter your private key.',
    invalidWif: 'Your private key appears invalid, please check for any mistakes.',
  };
  private helpMsg = this.helpMsgs.emptyForm;

  private invalidWifTimeout: NodeJS.Timeout | null = null;
  private privateKey: string = '';
  private ready: boolean = false;

  @Watch('privateKey')
  private onPropertyChanged(value: string) {
    this.ready = false;
    if (this.invalidWifTimeout) {
      clearTimeout(this.invalidWifTimeout);
      this.invalidWifTimeout = null;
    }

    if (value) {
      try {
        const key = KeyPair.fromWif(value);
        this.ready = true;
      } catch (e) {
        this.invalidWifTimeout = setTimeout(() => {
          this.helpMsg = this.helpMsgs.invalidWif;
          this.invalidWifTimeout = null;
        }, 250);

        if (e instanceof InvalidWif) {
          log.info('invalid wif:', e.message);
        } else {
          log.info('other error:', e);
        }
      }
    } else {
      this.helpMsg = this.helpMsgs.emptyForm;
    }
  }

  @Watch('ready')
  private onReadyChange(newReadyVal: boolean) {
    const btn = this.bottomBtns[1];
    if (btn.link !== this.dashboardPage) {
      throw new Error('expected page link ' + this.dashboardPage + ' got ' + btn.link);
    }
    btn.disabled = !newReadyVal;
  }

  private async buttonClick(evt: ButtonClickEvent) {
    if (evt.target.link !== this.dashboardPage || !this.ready) return;
    const password = RootStore.password!;
    const privateKey = this.privateKey;

    // Set both to null as they are no longer necessary
    RootStore.setPassword(null);
    RootStore.setKeypair(null); // May or may not be set, clear it just in case

    try {
      await ipc.send({
        type: 'settings:first_setup',
        password,
        privateKey,
      });
    } catch (e) {
      log.error('Failed to restore wallet', e);
    }
  }
}
</script>

<style lang="scss" scoped>
.form {
  color: hsla(0, 0, 100%, 0.55);
  padding-top: 2em;
  user-select: none;

  /deep/ .password-input input {
    font-size: 0.8em;
    height: 1.2em;

    &::placeholder {
      font-size: 1.4em;
      font-weight: 400;
    }
  }

  & > * {
    margin-bottom: 35px;
  }
}
</style>
