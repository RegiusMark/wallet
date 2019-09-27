<template>
  <div class="tooltip">
    <div @mouseover="show" @mouseleave="hide">
      <slot></slot>
    </div>
    <div class="tooltip-content" :style="displayStyle">
      <span>{{ msg }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Tooltip extends Vue {
  @Prop() private msg!: string;
  private displayStyle: { opacity: string } = { opacity: '0' };

  private show(): void {
    this.displayStyle = {
      opacity: '1',
    };
  }

  private hide(): void {
    this.displayStyle = {
      opacity: '0',
    };
  }
}
</script>

<style scoped lang="scss">
.tooltip {
  position: absolute;

  .tooltip-content {
    position: relative;
    bottom: 32px;
    padding: 5px 15px;
    border-radius: 4px;
    user-select: none;

    transition: opacity 375ms;

    background-color: hsla(0, 0, 0%, 0.6);
    color: hsla(0, 0, 100%, 0.8);
  }
}
</style>
