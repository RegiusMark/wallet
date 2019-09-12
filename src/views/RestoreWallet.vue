<template>
  <StartArea>
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
export default class RestoreWallet extends Vue {}
</script>
