<template>
  <DashArea>Backup</DashArea>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import DashArea from '@/components/DashArea.vue';

@Component({
  components: {
    DashArea,
  },
})
export default class Backup extends Vue {}
</script>

<style lang="scss" scoped></style>
