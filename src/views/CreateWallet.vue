<template>
  <StartArea :bottom-buttons="bottomBtns">
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
export default class CreateWallet extends Vue {
  private bottomBtns = [
    {
      icon: 'fa-history',
      link: '/restore-wallet',
      text: 'Restore',
    },
    {
      icon: 'fa-sign-in-alt',
      link: '/create-wallet',
      text: 'Create',
    },
  ];
}
</script>
