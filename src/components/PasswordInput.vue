<template>
  <div class="password-input">
    <Tooltip v-if="maskMode == MaskMode.Mixed" :msg="action">
      <i class="far fa-sm" style="font-size: 1em" :class="eyeIcon" @click="onEyeClick"></i>
    </Tooltip>
    <input
      type="text"
      autofocus
      :placeholder="placeholder"
      :value="value"
      @input="$emit('input', $event.target.value)"
      :style="{ '-webkit-text-security': this.textSecurity }"
    />
    <hr />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Model, Vue } from 'vue-property-decorator';
import Tooltip from './Tooltip.vue';

export enum MaskMode {
  None = 'none',
  Mixed = 'mixed',
  Forced = 'forced',
}

@Component({
  components: {
    Tooltip,
  },
})
export default class PasswordInput extends Vue {
  // Allow referencing in the template
  private readonly MaskMode = MaskMode;

  @Prop() private placeholder!: string;
  @Prop() private value!: string;

  @Prop({ default: () => MaskMode.Mixed }) private maskMode!: MaskMode;
  private masked: boolean = true;

  private get textSecurity() {
    switch (this.maskMode) {
      case MaskMode.None:
        return 'none';
      case MaskMode.Mixed:
        return this.masked ? 'disc' : 'none';
      case MaskMode.Forced:
        return 'disc';
      default: {
        const _exhaustiveCheck: never = this.maskMode;
        throw new Error('Unknown mask mode: ' + _exhaustiveCheck);
      }
    }
  }

  private get action(): string {
    return this.masked ? 'Show password' : 'Hide password';
  }

  private get eyeIcon(): string {
    return this.masked ? 'fa-eye' : 'fa-eye-slash';
  }

  private onEyeClick() {
    this.masked = !this.masked;
  }
}
</script>

<style lang="scss" scoped>
$icon-width: 35px;

.password-input input {
  width: 90%;
  text-align: center;
  background-color: transparent;
  border: 0;
  margin-left: $icon-width;
  outline: none;

  // Font & text properties
  caret-color: white;
  color: white;
  font-size: 1em;
  letter-spacing: 0.05em;
}

.password-input input::placeholder {
  color: hsla(0, 0, 100%, 0.75);
  font-style: normal;
  font-weight: 100;
}

.password-input input:focus::placeholder {
  color: hsla(0, 0, 100%, 0.85);
}

.password-input i {
  $color: hsla(0, 0, 100%, 0.3);
  transition: color 400ms;

  position: absolute;
  margin-top: 5px;
  color: $color;
  min-width: $icon-width;

  &:hover {
    cursor: pointer;
    color: adjust-color($color, $alpha: 0.3);
  }
}
</style>
