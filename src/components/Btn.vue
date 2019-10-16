<template>
  <div class="btn" @click="$emit('click', $event)">
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class Btn extends Vue {}
</script>

<style lang="scss" scoped>
.btn {
  margin: 1em;
  padding: 0.4em 1em;
  border: solid 2px hsla(275, 50, 40, 0.8);
  border-radius: 4px;

  background-color: hsla(275, 50, 40, 0.5);
  color: hsla(0, 0, 100, 0.9);
  font-size: 1.15em;
  text-align: center;

  user-select: none;
  cursor: pointer;

  transition: background-color 250ms;

  &:hover {
    background-color: hsla(275, 50, 40, 0.8);
    border-color: hsla(275, 50, 40, 1);
  }
}
</style>
