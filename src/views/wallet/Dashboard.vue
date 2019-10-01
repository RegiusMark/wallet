<template>
  <DashArea>Dashboard</DashArea>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import DashArea from '@/components/DashArea.vue';

@Component({
  components: {
    DashArea,
  },
})
export default class Dashboard extends Vue {}
</script>

<style lang="scss" scoped></style>
