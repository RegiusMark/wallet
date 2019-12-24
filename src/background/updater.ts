import { UpdateStatus, UpdateState, DOWNLOAD_UPDATE, STATUS_UPDATE, INSTALL_UPDATE } from '../ipc-models';
import { autoUpdater, CancellationToken } from 'electron-updater';
import { app, ipcMain, MenuItem } from 'electron';
import { getWindowInstance } from './index';
import { Logger } from '../log';

const log = new Logger('main:updater');

let downloadCancelToken: CancellationToken | undefined;
let status: UpdateStatus = {
  state: UpdateState.Clean,
  curVersion: app.getVersion(),
  newVersion: null,
  manualTrigger: false,
};

const CHECK_FOR_UPDATES = 'Check for Updates';
const CHECKING_FOR_UPDATES = 'Checking for updates...';

export const checkForUpdatesMenuItem = new MenuItem({
  label: CHECK_FOR_UPDATES,
  click: async (): Promise<void> => {
    try {
      status.manualTrigger = true;
      await checkForUpdates();
    } catch (e) {
      log.error('Unexpected error checking for updates manually', e);
    } finally {
      status.manualTrigger = false;
    }
  },
  // Visibility state is changed when the dashboard window is loaded
  visible: false,
  enabled: true,
});

export function setupUpdater(): void {
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', info => {
    status.state = UpdateState.UpdateAvailable;
    status.newVersion = info.version;
    emitUpdate();
  });

  autoUpdater.on('update-not-available', () => {
    status.state = UpdateState.NoUpdateAvailable;
    status.newVersion = null;
    emitUpdate();
  });

  autoUpdater.on('update-downloaded', () => {
    status.state = UpdateState.ReadyForInstall;
    emitUpdate();
  });

  autoUpdater.on('error', e => {
    log.error('autoupdater error:', e);
    status.state = UpdateState.Error;
    emitUpdate();
  });

  ipcMain.on(DOWNLOAD_UPDATE, async () => {
    if (status.state !== UpdateState.UpdateAvailable) return;
    try {
      // There shouldn't be a cancel token, but just in case.
      cancelDownload();

      status.state = UpdateState.Downloading;
      emitUpdate();

      downloadCancelToken = new CancellationToken();
      await autoUpdater.downloadUpdate(downloadCancelToken);
    } catch {
      // Errors go into the error handler
    }
  });

  ipcMain.on(INSTALL_UPDATE, () => {
    if (status.state !== UpdateState.ReadyForInstall) return;
    try {
      autoUpdater.quitAndInstall();
    } catch {
      // Errors go into the error handler
    }
  });
}

export async function checkForUpdates(): Promise<void> {
  if (status.state === UpdateState.Checking) return;

  checkForUpdatesMenuItem.enabled = false;
  checkForUpdatesMenuItem.label = CHECKING_FOR_UPDATES;
  try {
    // Cancel any existing download before performing another update check
    cancelDownload();

    status.state = UpdateState.Checking;
    emitUpdate();

    await autoUpdater.checkForUpdates();
  } catch {
    // Errors go into the error handler
  }
  checkForUpdatesMenuItem.label = CHECK_FOR_UPDATES;
  checkForUpdatesMenuItem.enabled = true;
}

function cancelDownload(): void {
  if (!downloadCancelToken) return;
  downloadCancelToken.cancel();
  downloadCancelToken = undefined;
}

function emitUpdate(): void {
  const window = getWindowInstance();
  if (window === null) {
    return;
  }

  window.webContents.send(STATUS_UPDATE, status);
}
