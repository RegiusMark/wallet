<template>
  <div v-if="value">
    <div class="dialog" ref="dialog" tabindex="0" @keyup.esc="$emit('input', false)">
      <div class="dialog-content" :style="{ width }">
        <div style="height: 0.1px">
          <!-- Empty div to allow margins to be used in the slot while preserving the background-color -->
        </div>
        <div style="margin: 1.2em;">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from 'vue-property-decorator';

@Component
export default class Dialog extends Vue {
  @Prop({ default: () => false })
  value!: boolean;

  @Prop({ default: () => 'auto' })
  width!: string | number;

  @Watch('value')
  private onActiveChange(value: boolean): void {
    if (value === true) {
      this.$nextTick(() => {
        (this.$refs.dialog as HTMLElement).focus();
      });
    }
  }
}
</script>

<style lang="scss" scoped>
.dialog {
  position: fixed;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  z-index: 5;
  outline: none;

  background-color: hsla(267, 59, 6, 0.95);
  color: hsla(0, 0, 100, 0.7);
}

.dialog-content {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);

  background-color: hsla(267, 59, 12, 0.85);
  border-radius: 4px;
}
</style>
