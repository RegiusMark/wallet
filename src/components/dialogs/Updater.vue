<template>
  <Dialog class="dialog-updater" width="75%" :disable-esc="true" :value="value" @input="dialogActiveChange">
    <i class="fas fa-download update-icon"></i>
    <div class="status-content">
      <div v-if="status.state === UpdateState.Checking">
        <div>Checking for updates</div>
      </div>
      <div v-else-if="status.state === UpdateState.UpdateAvailable">
        <div>Update version {{ status.newVersion }} is available</div>
        <div>Current version is {{ status.curVersion }}</div>
      </div>
      <div v-else-if="status.state === UpdateState.NoUpdateAvailable">
        <div>No new updates!</div>
      </div>
      <div v-else-if="status.state === UpdateState.Downloading">
        <div>Downloading the new update...</div>
        <div>New version is {{ status.newVersion }}, current version is {{ status.curVersion }}</div>
      </div>
      <div v-else-if="status.state === UpdateState.ReadyForInstall">
        <div>Update is ready to be installed!</div>
      </div>
      <div v-else-if="status.state === UpdateState.Error">
        <div>Error checking or downloading an update</div>
        <div>If the error persists, please manually download and install the latest version.</div>
      </div>
      <div v-else>
        <!-- The clean state falls here, should never happen -->
        <div>Unhandled updater state</div>
        <div>{{ UpdateState[status.state] }} (id: {{ status.state }})</div>
      </div>
    </div>
    <div v-for="btn in stateActionButtons" :key="btn.label" class="action-buttons">
      <Btn @click="btn.action">{{ btn.label }}</Btn>
    </div>
    <div v-if="isProgressable" class="loading-bar">
      <!-- The child is the bar defined in css -->
      <div></div>
    </div>
  </Dialog>
</template>

<script lang="ts">
import { UpdateStatus, UpdateState, STATUS_UPDATE, DOWNLOAD_UPDATE, INSTALL_UPDATE } from '@/ipc-models';
import { Component, Prop, Vue } from 'vue-property-decorator';
import Dialog from '@/components/Dialog.vue';
import Btn from '@/components/Btn.vue';
import { ipcRenderer } from 'electron';

@Component({
  components: {
    Dialog,
    Btn,
  },
})
export default class extends Vue {
  // Allow referencing in the template
  private readonly UpdateState = UpdateState;

  private updateListener: ((evt: Electron.IpcRendererEvent, status: UpdateStatus) => void) | null = null;

  @Prop({ default: () => false })
  private value!: boolean;

  private status: UpdateStatus = {
    // Default to checking since that is the most likely state when the dialog opens
    state: UpdateState.Checking,
    curVersion: '<UNKNOWN>',
    newVersion: null,
  };

  private get stateActionButtons(): any {
    interface Button {
      label: string;
      action: () => void;
    }

    const btns: Button[] = [];
    const state = this.status.state;
    switch (state) {
      case UpdateState.Clean:
        break;
      case UpdateState.Checking:
        break;
      case UpdateState.UpdateAvailable:
        btns.push({
          label: 'Download Update',
          action: () => ipcRenderer.send(DOWNLOAD_UPDATE),
        });
        break;
      case UpdateState.NoUpdateAvailable:
        break;
      case UpdateState.Downloading:
        break;
      case UpdateState.ReadyForInstall:
        btns.push({
          label: 'Install Update',
          action: () => ipcRenderer.send(INSTALL_UPDATE),
        });
        break;
      case UpdateState.Error:
        break;
      default:
        const _exhaustiveCheck: never = state;
        throw new Error('unhandled state: ' + _exhaustiveCheck);
    }

    if (!this.isProgressable) {
      btns.push({
        label: 'Close',
        action: () => this.dialogActiveChange(false),
      });
    }

    return btns;
  }

  private get isProgressable(): boolean {
    const state = this.status.state;
    return state === UpdateState.Checking || state === UpdateState.Downloading;
  }

  /* Vue lifecycle hook */
  private beforeMount(): void {
    this.updateListener = (_evt, status): void => {
      this.status = status;
      if (
        status.manualTrigger ||
        status.state === UpdateState.UpdateAvailable ||
        status.state === UpdateState.ReadyForInstall
      ) {
        this.dialogActiveChange(true);
      }
    };
    ipcRenderer.on(STATUS_UPDATE, this.updateListener);
  }

  /* Vue lifecycle hook */
  private beforeDestroy(): void {
    if (this.updateListener) {
      ipcRenderer.removeListener(STATUS_UPDATE, this.updateListener);
    }
  }

  private dialogActiveChange(active: boolean): void {
    this.$emit('input', active);
  }
}
</script>

<style lang="scss" scoped>
.dialog-updater {
  text-align: center;
  font-size: 1.3em;

  .update-icon {
    font-size: 1.3em;
    padding-bottom: 0.5em;
    color: hsla(0, 0, 100, 0.5);
  }

  .status-content > * {
    // Header text
    :nth-child(1) {
      font-size: 1em;
    }

    // Sub header text
    :nth-child(2) {
      padding-top: 0.4em;
      font-size: 0.75em;
    }
  }

  .action-buttons {
    min-width: 30%;
    width: 30%;
    font-size: 0.7em;
    display: inline-block;
  }
}

.loading-bar {
  position: absolute;
  overflow: hidden;
  width: 100%;
  bottom: 0;
  left: 0;

  :first-child {
    height: 6px;
    width: 100%;
    background-color: hsla(55, 83, 50, 0.5);
    border-radius: 12px;
    animation: 4s ease-in-out infinite loading;
  }
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }

  50% {
    transform: translateX(100%);
  }

  100% {
    transform: translateX(-100%);
  }
}
</style>
