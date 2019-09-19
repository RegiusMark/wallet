<template>
  <StartArea :bottom-buttons="bottomBtns" header-msg="Backup wallet">
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
import { Component, Vue } from 'vue-property-decorator';
import StartArea from '@/components/StartArea.vue';
import { generateKeyPair } from 'godcoin';

@Component({
  components: {
    StartArea,
  },
})
export default class CreateWallet2 extends Vue {
  private readonly createWalletPage = '/create-wallet';
  private readonly privateKey = generateKeyPair().privateKey.toWif();

  private bottomBtns = [
    {
      icon: 'fa-history',
      link: '/restore-wallet',
      text: 'Restore',
      disabled: false,
    },
    {
      icon: 'fa-sign-in-alt',
      link: this.createWalletPage,
      text: 'Create',
      disabled: true,
    },
  ];

  /* Vue lifecycle hook */
  private mounted() {
    setTimeout(() => {
      const btn = this.bottomBtns[1];
      if (btn.link !== this.createWalletPage) {
        throw new Error('Expected page link to be the create wallet page');
      }
      btn.disabled = false;
    }, 5000);
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
