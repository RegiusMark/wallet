<template>
  <Start :bottom-buttons="bottomBtns" header-msg="Backup wallet" @bottom-button-click="buttonClick">
    <div class="form">
      <div>
        <div style="margin-bottom: 0.5em">Private key</div>
        <div class="key" style="user-select: text;">{{ privateKey }}</div>
        <hr />
      </div>
      <div style="display: flex; font-size: 1.1em">
        <div>
          <i class="fas fa-exclamation-triangle" style="padding-right: 0.7em"></i>
        </div>
        <div>
          <span>Write down your private key and store it in a safe place.&nbsp;</span>
          <span>Losing your key will result in the loss of funds.</span>
        </div>
      </div>
    </div>
  </Start>
</template>

<script lang="ts">
import Start, { StartBtn, StartBtnClickEvent } from '@/components/win-area/Start.vue';
import { Component, Vue } from 'vue-property-decorator';
import { generateKeyPair } from 'godcoin';
import { RootStore } from '@/store';
import ipc from '@/renderer/ipc';
import { Logger } from '@/log';

const log = new Logger('create-wallet-2');

@Component({
  components: {
    Start,
  },
})
export default class extends Vue {
  private readonly dashboardPage = '/wallet/dashboard';

  private bottomBtns: StartBtn[] = [
    {
      icon: 'fa-arrow-circle-left',
      go: -1,
      text: 'Go back',
      disabled: false,
    },
    {
      icon: 'fa-sign-in-alt',
      link: this.dashboardPage,
      text: 'Create',
      disabled: true,
    },
  ];

  private get privateKey(): string | null {
    const key = RootStore.keyPair;
    return key ? key.privateKey.toWif() : null;
  }

  /* Vue lifecycle hook */
  private beforeMount(): void {
    if (RootStore.keyPair === null) {
      RootStore.setKeypair(generateKeyPair());
    }
  }

  /* Vue lifecycle hook */
  private mounted(): void {
    setTimeout((): void => {
      const btn = this.bottomBtns[1];
      if (btn.link !== this.dashboardPage) {
        throw new Error('expected page link ' + this.dashboardPage + ' got ' + btn.link);
      }
      btn.disabled = false;
    }, 5000);
  }

  private async buttonClick(evt: StartBtnClickEvent): Promise<void> {
    if (evt.target.link !== this.dashboardPage) return;
    evt.canceled = true;

    const password = RootStore.password!;
    const keyPair = RootStore.keyPair!;

    try {
      // A new window will be created afterwards
      await ipc.firstSetup(password, keyPair);
    } catch (e) {
      log.error('Failed to create wallet', e);
    }
  }
}
</script>

<style lang="scss" scoped>
.form {
  color: hsla(0, 0, 100%, 0.6);
  user-select: none;

  & > * {
    margin-bottom: 35px;
  }
}

.key {
  color: hsla(0, 0, 100%, 0.8);
}
</style>
