<template>
  <StartArea>
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
export default class CreateWallet extends Vue {}
</script>
