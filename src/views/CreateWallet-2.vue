<template>
  <StartArea :bottom-buttons="bottomBtns" header-msg="Backup information">
    <div></div>
  </StartArea>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import StartArea from '@/components/StartArea.vue';

@Component({
  components: {
    StartArea,
  },
})
export default class CreateWallet2 extends Vue {
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
