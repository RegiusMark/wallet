import { Lock } from '../../src/lock';

test('properly lock and unlock', async () => {
  const lock = new Lock();
  await lock.lock();

  const promises: boolean[] = new Array(10).fill(false);
  for (let i = 0; i < promises.length; ++i) {
    await new Promise(async resolve => {
      resolve();
      await lock.lock();
      promises[i] = true;
    });
  }

  for (let o = 0; o < promises.length; ++o) {
    lock.unlock();
    await new Promise(resolve => setImmediate(resolve));
    for (let i = 0; i <= o; ++i) {
      expect(promises[i]).toBe(true);
    }
    for (let i = o + 1; i < promises.length; ++i) {
      expect(promises[i]).toBe(false);
    }
  }

  await new Promise(resolve => setImmediate(resolve));
  for (let i = 0; i < promises.length; ++i) {
    expect(promises[i]).toBe(true);
  }
  // The lock flag is still set as the unlock is called separately
  expect(lock.locked).toBe(true);
  lock.unlock();
  expect(lock.locked).toBe(false);
}, 1000);
