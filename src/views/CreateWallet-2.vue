<template>
  <StartArea :bottom-buttons="bottomBtns" header-msg="Backup information">
    <div>{{ privateKey }}</div>
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
  private privateKey = generateKeyPair().privateKey.toWif();

  private bottomBtns = [
    {
      icon: 'fa-history',
      link: '/restore-wallet',
      text: 'Restore',
      disabled: false,
    },
    {
      icon: 'fa-sign-in-alt',
      link: '/create-wallet',
      text: 'Create',
      disabled: false,
    },
  ];
}
</script>
