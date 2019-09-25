<template>
  <StartArea :bottom-buttons="bottomBtns" @bottom-button-click="buttonClick" header-msg="Backup wallet">
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
          <span>Write down your private key in a safe place.&nbsp;</span>
          <span>Losing your key will result in the loss of funds.</span>
        </div>
      </div>
    </div>
  </StartArea>
</template>

<script lang="ts">
import StartArea, { Button, ButtonClickEvent } from '@/components/StartArea.vue';
import { Component, Vue } from 'vue-property-decorator';
import { generateKeyPair } from 'godcoin';
import { RootStore } from '@/store';
import { Logger } from '@/log';
import ipc from '@/renderer/ipc';

const log = new Logger('create-wallet-2');

@Component({
  components: {
    StartArea,
  },
})
export default class CreateWallet2 extends Vue {
  private readonly dashboardPage = '/dashboard';

  private bottomBtns: Button[] = [
    {
      icon: 'fa-arrow-circle-left',
      link: '/create-wallet-1',
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

  private get privateKey() {
    const key = RootStore.keyPair;
    return key ? key.privateKey.toWif() : null;
  }

  /* Vue lifecycle hook */
  private beforeMount() {
    if (RootStore.keyPair === null) {
      RootStore.setKeypair(generateKeyPair());
    }
  }

  /* Vue lifecycle hook */
  private mounted() {
    setTimeout(() => {
      const btn = this.bottomBtns[1];
      if (btn.link !== this.dashboardPage) {
        throw new Error('expected page link ' + this.dashboardPage + ' got ' + btn.link);
      }
      btn.disabled = false;
    }, 5000);
  }

  private async buttonClick(evt: ButtonClickEvent) {
    if (evt.target.link !== this.dashboardPage) return;
    const password = RootStore.password!;
    const keyPair = RootStore.keyPair!;

    RootStore.setPassword(null);
    RootStore.setKeypair(null);

    try {
      await ipc.send({
        type: 'settings:first_setup',
        password,
        privateKey: keyPair.privateKey.toWif(),
      });
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
