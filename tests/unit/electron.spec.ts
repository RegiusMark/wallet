import { testWithSpectron } from 'vue-cli-plugin-electron-builder';
import { Application } from 'spectron';

jest.setTimeout(50000);

let app: Application;
let stopServe: () => Promise<Application>;

beforeAll(async () => {
  const spectron = await testWithSpectron();
  app = spectron.app;
  stopServe = spectron.stopServe;
});

afterAll(async () => {
  await stopServe();
});

beforeEach(async () => {
  await app.restart();
});

test('Window Loads Properly', async () => {
  const win = app.browserWindow;
  const client = app.client;

  // Window was created
  expect(await client.getWindowCount()).toBe(1);
  // It is not minimized
  expect(await win.isMinimized()).toBe(false);
  // Window is visible
  expect(await win.isVisible()).toBe(true);
  // Size is correct
  const { width, height } = await win.getBounds();
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);

  // Redirects to the create wallet setup page for new users
  expect(new URL(await app.webContents.getURL()).hash).toBe('#/create-wallet-1');
});
