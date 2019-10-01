import { createProtocol, installVueDevtools } from 'vue-cli-plugin-electron-builder/lib';
import { app, protocol, BrowserWindow, dialog } from 'electron';
import sodium from 'libsodium-wrappers';
import { WalletDb } from './db';
import { Logger } from '../log';
import setupIpc from './ipc';

const isDevelopment = process.env.NODE_ENV !== 'production';
const log = new Logger('main');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let window: BrowserWindow | null = null;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { secure: true, standard: true } }]);

async function loadAppURL(loc: string): Promise<void> {
  let url: string;
  if (isDevelopment || process.env.IS_TEST) {
    url = process.env.WEBPACK_DEV_SERVER_URL as string;
    if (!process.env.IS_TEST && window !== null) window.webContents.openDevTools();
  } else {
    url = 'app://./index.html';
  }
  url += '#' + loc;
  if (window !== null) {
    await window.loadURL(url);
  }
}

function installWindowHooks(): void {
  if (!window) throw new Error('no window found');

  window.once('ready-to-show', () => {
    if (window) {
      window.show();
    }
  });

  window.on('closed', () => {
    window = null;
  });
}

function createStartWindow(): void {
  if (window !== null) {
    window.destroy();
    window = null;
  }

  window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    resizable: false,
    show: false,
    // Color relatively close to the background image
    backgroundColor: '#12233f',
  });

  loadAppURL('/');
  installWindowHooks();
}

export function createDashboardWindow(): void {
  if (window !== null) {
    window.destroy();
    window = null;
  }

  window = new BrowserWindow({
    width: 1200,
    height: 760,
    webPreferences: {
      nodeIntegration: true,
    },
    show: false,
    // Same color as the components/DashArea.vue background color
    backgroundColor: '#1C0C2F',
  });

  loadAppURL('/dashboard');
  installWindowHooks();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (window === null) {
    createStartWindow();
  }
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.on('ready', async () => {
    await sodium.ready;

    if (isDevelopment && !process.env.IS_TEST) {
      // Install Vue Devtools
      // Devtools extensions are broken in Electron 6.0.0 and greater
      // See https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/378 for more info
      // Electron will not launch with Devtools extensions installed on Windows 10 with dark mode
      // If you are not using Windows 10 dark mode, you may uncomment these lines
      // In addition, if the linked issue is closed, you can upgrade electron and uncomment these lines
      try {
        if (process.platform !== 'win32') {
          await installVueDevtools();
        }
      } catch (e) {
        log.error('Vue Devtools failed to install:', e.toString());
      }
    }

    try {
      createProtocol('app');

      await WalletDb.init();
      setupIpc();

      createStartWindow();
    } catch (e) {
      dialog.showErrorBox('Fatal startup error', e.toString());
    }
  });
}

function uncaughtHandler(err: any, _prom?: Promise<any>): void {
  let message = 'Fatal error:\n';
  if (err instanceof Error) {
    message += err.message + '\n' + err.stack;
  } else {
    message += err;
  }

  const messageBoxOptions = {
    type: 'error',
    title: 'Fatal error',
    message,
  };
  dialog.showMessageBox(messageBoxOptions);
  app.quit();
}

if (!isDevelopment) {
  // Only enable during production so the development errors get printed to console
  process.on('uncaughtException', uncaughtHandler);
  process.on('unhandledRejection', uncaughtHandler);
}

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit();
      }
    });
  } else {
    process.on('SIGTERM', () => {
      app.quit();
    });
  }
}
