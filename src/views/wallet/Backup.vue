<template>
  <DashArea>
    <div class="container">
      <div style="margin-top: 0.85em; user-select: none;">
        <img src="../../assets/coin-front.png" width="120" />
      </div>
      <div class="header">Backup your Regius Mark key</div>
      <div class="info">
        <div class="subheader">Remember when making your backup...</div>
        <div class="msg">
          <div>Write down your private key and store it in a safe place.</div>
          <div>Losing your key will result in the loss of funds.</div>
          <div>Anyone with access to your key can transfer your funds.</div>
        </div>
      </div>
      <div class="container-separator"></div>
      <Btn v-if="!privateKey" style="font-size: 1em" @click="revealKey">Reveal Private Key</Btn>
      <div v-else class="private-key-container">
        <div class="header">Private Key</div>
        <div class="key">
          <span>{{ privateKey }}</span>
        </div>
      </div>
    </div>
  </DashArea>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import DashArea from '@/components/DashArea.vue';
import Btn from '@/components/Btn.vue';
import ipc from '@/renderer/ipc';

@Component({
  components: {
    DashArea,
    Btn,
  },
})
export default class Backup extends Vue {
  private revealed = false;
  private privateKey: string | null = null;

  private revealKey(): void {
    if (this.revealed) return;
    this.revealed = true;

    (async (): Promise<void> => {
      const keyPair = (await ipc.getPrivateKey()).key;
      this.privateKey = keyPair.privateKey.toWif();
    })();
  }
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  user-select: none;

  .container-separator {
    width: 85%;
    margin-top: 1em;
    border-top: solid 2px hsla(0, 0, 100, 0.1);
  }

  & > div {
    flex: 1;
  }
}

.header {
  font-size: 1.1em;
  margin: 1.1em;
  color: hsla(0, 0, 100, 0.8);
}

.info {
  width: 85%;

  .subheader {
    color: hsla(0, 0, 100, 0.6);
    margin-bottom: 0.5em;
  }

  .msg {
    font-size: 1em;
    color: hsla(0, 0, 100, 0.8);

    & > div {
      margin-bottom: 0.25em;
      &::before {
        content: '\2014 ';
        color: hsla(0, 0, 100, 0.6);
      }
    }
  }
}

.private-key-container {
  text-align: center;

  .header {
    font-size: 1em;
    color: hsla(0, 0, 100, 0.6);
  }

  .key {
    font-size: 1.05em;
    color: hsla(0, 0, 100, 0.85);
    user-select: all;

    & > :first-child {
      padding: 0.4em;
      background-color: hsla(0, 0, 40, 0.2);
      border-radius: 4px;
    }
  }
}
</style>
