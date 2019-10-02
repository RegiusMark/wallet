<template>
  <div class="dash-area">
    <div class="dash-sidebar">
      <div class="dash-logo">
        <img src="../assets/logo.png" width="60" />
      </div>
      <div class="dash-buttons">
        <span v-for="btn in buttons" :key="btn.link">
          <router-link :to="btn.link" tag="div" :class="{ active: btn.active }">
            <i class="fas" style="padding-right: 0.8em" :class="btn.icon"></i>
            <span>{{ btn.text }}</span>
          </router-link>
        </span>
      </div>
    </div>
    <div class="dash-content">
      <div class="dash-content-slot">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

interface MenuButton {
  icon: string;
  link?: string;
  text: string;
  active: boolean;
}

@Component
export default class DashArea extends Vue {
  private readonly buttons: MenuButton[] = [
    {
      icon: 'fa-wallet',
      link: '/wallet/dashboard',
      text: 'Wallet',
      active: false,
    },
    {
      icon: 'fa-file-export',
      link: '/wallet/backup',
      text: 'Backup',
      active: false,
    },
  ];

  /* Vue lifecycle hook */
  private beforeMount(): void {
    const path = this.$router.currentRoute.path;
    for (const btn of this.buttons) {
      if (btn.link === path) {
        btn.active = true;
        break;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
$sidebar-width: 12em;
// The backgroundColor also needs to change in the BrowserWindow instantiation
$background-color: hsla(267, 74, 18, 1);

.dash-area {
  color: white;

  &::before {
    background-color: $background-color;
    content: '';
    width: 100%;
    height: 100%;

    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
  }
}

.dash-sidebar {
  width: $sidebar-width;
  height: 100%;
  margin: 0 auto;
  position: absolute;
  background-color: darken($background-color, 5%);

  .dash-logo {
    text-align: center;
    padding-top: 1em;
  }

  .dash-buttons {
    margin-top: 1.5em;
    user-select: none;

    & > span div {
      color: hsla(0, 0, 100, 0.65);
      padding: 1em 1.5em;
      font-size: 0.95em;
      font-weight: 100;
      cursor: pointer;

      i {
        color: hsla(0, 0, 100, 0.55);
      }

      &.active {
        background-color: darken($background-color, 10%);
        color: hsla(0, 0, 100, 0.8);
        cursor: default;

        i {
          color: hsla(0, 0, 100, 0.7);
        }
      }
    }
  }
}

.dash-content {
  position: absolute;
  margin-left: $sidebar-width;

  .dash-content-slot {
    margin: 1em;
  }
}
</style>
