<template>
  <div class="start">
    <div class="logo">
      <img src="../../assets/logo.png" width="100" />
    </div>
    <div class="header">{{ headerMsg }}</div>
    <slot />
    <div class="footer">
      <div class="bottom-btns">
        <template v-for="btn in bottomButtons">
          <div :key="btn.text" :class="{ disabled: btn.disabled }" class="bottom-btn" @click="onBottomBtnClick(btn)">
            <i class="fas fa-lg" :class="btn.icon"></i>
            <div class="bottom-btn-txt">{{ btn.text }}</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

export interface StartBtn {
  icon: string;
  link?: string;
  go?: number;
  text: string;
  disabled: boolean;
}

export interface StartBtnClickEvent {
  canceled: boolean;
  target: StartBtn;
}

@Component
export default class extends Vue {
  @Prop({
    default: () => [],
    validator: (btns: StartBtn[]) => {
      for (const btn of btns) {
        if (!(btn.icon && btn.text && typeof btn.disabled === 'boolean')) {
          return false;
        }
        if ((btn.link === undefined && btn.go === undefined) || (btn.link !== undefined && btn.go !== undefined)) {
          return false;
        }
      }
      return true;
    },
  })
  private bottomButtons!: StartBtn[];

  @Prop({ required: true })
  private headerMsg!: string;

  private onBottomBtnClick(btn: StartBtn): void {
    if (btn.disabled) return;
    const evt: StartBtnClickEvent = { canceled: false, target: btn };
    this.$emit('bottom-button-click', evt);
    if (!evt.canceled) {
      if (btn.link !== undefined) {
        this.$router.push(btn.link);
      } else if (btn.go !== undefined) {
        this.$router.go(btn.go);
      }
    }
  }
}
</script>

<style lang="scss" scoped>
$margin: 13%;

.logo {
  text-align: center;
  padding-top: 1em;
}

.start {
  margin-left: $margin;
  margin-right: $margin;

  &::before {
    background-image: url('../../assets/login-bg.jpg');
    background-size: cover;
    content: '';
    width: 100%;
    height: 100%;

    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
  }
}

.header {
  color: hsla(0, 0, 100%, 0.9);
  text-align: center;
  margin-top: 1.12em;
  margin-bottom: 2.4em;
  font-size: 1.25em;
  font-weight: 900;
  user-select: none;
}

.footer {
  position: absolute;
  bottom: 5%;
  left: 0;
  width: 100%;
}

.bottom-btns {
  margin-left: $margin;
  margin-right: $margin;

  display: flex;
  justify-content: space-between;
  text-align: center;
  user-select: none;
}

.bottom-btn {
  $btns-color: hsla(0, 0, 100%, 0.5);

  background-color: adjust-color($btns-color, $alpha: -0.44);
  color: $btns-color;
  border-radius: 4px;
  padding: 15px;
  width: 56px;
  height: 48px;

  .bottom-btn-txt {
    font-size: 0.9em;
    padding-top: 8px;
  }

  &:last-child {
    background-color: adjust-color($btns-color, $alpha: -0.425);
    color: adjust-color($btns-color, $alpha: 0.05);

    .bottom-btn-txt {
      font-weight: bold;
    }
  }

  &:not(.disabled):hover {
    background-color: adjust-color($btns-color, $alpha: -0.4);
    color: adjust-color($btns-color, $alpha: 0.24);
    cursor: pointer;

    .bottom-btn-txt {
      color: adjust-color($btns-color, $alpha: 0.24);
    }
  }

  &.disabled {
    background-color: adjust-color($btns-color, $lightness: -70%, $alpha: -0.4);
    color: adjust-color($btns-color, $alpha: -0.25);
    cursor: default;
  }
}
</style>
