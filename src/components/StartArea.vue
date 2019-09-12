<template>
  <div class="start">
    <div class="start--content">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class StartArea extends Vue {}
</script>

<style lang="scss" scoped>
.start {
  margin-left: 15%;
  margin-right: 15%;

  &::before {
    background-image: url('../assets/login-bg.jpg');
    background-size: cover;
    content: '';
    width: 100%;
    height: 100%;

    position: absolute;
    top: 0;
    left: 0;
  }

  .start--content {
    position: relative;
  }
}
</style>
