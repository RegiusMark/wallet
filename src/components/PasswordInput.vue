<template>
  <div class="text-input">
    <Tooltip :msg="action">
      <i class="far fa-sm" style="font-size: 1em" :class="eyeIcon" v-on:click="onEyeClick"></i>
    </Tooltip>
    <input :type="inputType" autofocus :placeholder="placeholder" />
    <hr />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Tooltip from './Tooltip.vue';

@Component({
  components: {
    Tooltip,
  },
})
export default class PasswordInput extends Vue {
  @Prop() private placeholder!: string;
  private masked = true;

  private get action(): string {
    return this.masked ? 'Show password' : 'Hide password';
  }

  private get inputType(): string {
    return this.masked ? 'password' : 'text';
  }

  private get eyeIcon(): string {
    return this.masked ? 'fa-eye' : 'fa-eye-slash';
  }

  onEyeClick() {
    this.masked = !this.masked;
  }
}
</script>

<style scoped lang="scss">
$icon-width: 35px;

.text-input input {
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

.text-input input::placeholder {
  color: hsla(0, 0, 100%, 0.75);
  font-style: normal;
  font-weight: 100;
}

.text-input input:focus::placeholder {
  color: hsla(0, 0, 100%, 0.85);
}

.text-input i {
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
