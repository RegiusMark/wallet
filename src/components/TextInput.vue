<template>
  <div class="text-input">
    <i class="fas fa-sm" :class="icon"></i>
    <input type="text" :placeholder="placeholder" :value="value" @input="$emit('input', $event.target.value)" />
    <div class="underline"></div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from 'vue-property-decorator';

export enum MaskMode {
  None = 'none',
  Mixed = 'mixed',
  Forced = 'forced',
}

@Component
export default class extends Vue {
  @Prop({ required: true }) icon!: string;
  @Prop() private readonly placeholder!: string;
  @Prop() private readonly value!: string;
}
</script>

<style lang="scss" scoped>
$icon-width: 30px;

.text-input input {
  // The width isn't 100% to prevent the text from overhanging
  width: 95%;
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

.text-input input::placeholder {
  color: hsla(0, 0, 100%, 0.75);
  font-style: normal;
  font-weight: 100;
  font-size: 0.9em;
}

.text-input input:focus::placeholder {
  color: hsla(0, 0, 100%, 0.85);
}

.text-input i {
  position: absolute;
  margin: 2px;
  color: hsla(0, 0, 100%, 0.45);
  font-size: 1em;
}

.text-input .underline {
  margin-top: 5px;
  height: 2px;
  background-color: hsla(0, 0, 100%, 0.5);
}
</style>
