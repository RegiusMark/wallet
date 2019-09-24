import { app, protocol, BrowserWindow, dialog } from 'electron';
import { createProtocol, installVueDevtools } from 'vue-cli-plugin-electron-builder/lib';
import { WalletDb } from './db';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let window: BrowserWindow | null;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { secure: true, standard: true } }]);

function createWindow() {
  // Create the browser window.
  window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    resizable: false,
    show: false,
  });

  if (isDevelopment || process.env.IS_TEST) {
    // Load the url of the dev server if in development mode
    window.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
    if (!process.env.IS_TEST) window.webContents.openDevTools();
  } else {
    createProtocol('app');
    // Load the index.html when not in development
    window.loadURL('app://./index.html');
  }

  window.once('ready-to-show', () => {
    if (window) {
      window.show();
    }
  });

  window.on('closed', () => {
    window = null;
  });
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
    createWindow();
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
        console.error('Vue Devtools failed to install:', e.toString());
      }
    }

    try {
      await WalletDb.init();

      // Create the window
      createWindow();
    } catch (e) {
      dialog.showErrorBox('Fatal startup error', e.toString());
    }
  });
}

function uncaughtHandler(err: any, promise?: Promise<any>) {
  let message: string = 'Fatal error:\n';
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
  // Only enable during production so the errors get printed to console
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
