<template>
  <StartArea header-msg="Restore wallet">
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
import StartArea from '@/components/StartArea.vue';
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

  private helpMsgs = {
    emptyForm: 'In order to restore your wallet, we need you to enter your private key.',
    invalidWif: 'Your private key appears invalid, please check for any mistakes.',
  };
  private helpMsg = this.helpMsgs.emptyForm;

  private invalidWifTimeout: NodeJS.Timeout | null = null;
  private privateKey: string = '';

  @Watch('privateKey')
  private onPropertyChanged(value: string) {
    if (this.invalidWifTimeout) {
      clearTimeout(this.invalidWifTimeout);
      this.invalidWifTimeout = null;
    }

    if (value) {
      try {
        const key = KeyPair.fromWif(value);
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
