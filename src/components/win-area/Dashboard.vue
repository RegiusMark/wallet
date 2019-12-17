<template>
  <div class="dash-area">
    <div class="dash-sidebar">
      <div class="dash-logo">
        <img src="../../assets/logo.png" width="60" />
      </div>
      <div class="dash-sync-status">
        <div v-if="syncStatus === SyncStatus.Complete">Sync complete</div>
        <div v-else-if="syncStatus === SyncStatus.InProgress">Synchronizing...</div>
        <div v-else-if="syncStatus === SyncStatus.Connecting">Connecting...</div>
        <div v-else>Unknown sync state.</div>
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
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { SyncStatus } from '@/ipc-models';
import { State } from 'vuex-class';

interface MenuButton {
  icon: string;
  link?: string;
  text: string;
  active: boolean;
}

@Component
export default class extends Vue {
  // Allow referencing in the template
  private readonly SyncStatus = SyncStatus;

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

  @State(state => state.wallet.syncStatus)
  private syncStatus!: SyncStatus;

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
// The backgroundColor also needs to change in the BrowserWindow instantiation
$background-color: hsla(267, 59, 12, 1);

.dash-area {
  display: flex;
  flex-flow: row nowrap;
  height: 100%;

  color: white;
}

.dash-sidebar {
  flex: 0 0 12em;
  background-color: darken($background-color, 5%);
  user-select: none;

  .dash-logo {
    text-align: center;
    padding-top: 1em;
  }

  .dash-sync-status {
    text-align: center;
    color: hsla(0, 0, 100, 0.55);
    margin-top: 1em;
  }

  .dash-buttons {
    margin-top: 1.5em;

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
        background-color: $background-color;
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
  flex: 1;
  overflow-y: auto;
}
</style>
