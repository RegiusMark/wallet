const assert = require('assert');

const IS_SPECTRON = process.env.IS_SPECTRON === '1';

const FORCE_CODE_SIGNING = process.env.FORCE_CODE_SIGNING !== 'false';
/* eslint-disable-next-line no-console */
console.log('Code signing forced:', FORCE_CODE_SIGNING);

function getEnv(env, def) {
  if (def !== undefined) {
    assert(typeof def === 'string');
  }
  const envVar = JSON.stringify(process.env[env] !== undefined ? process.env[env] : def);
  if (envVar === undefined) {
    throw new Error('Missing required environment variable: ' + env);
  }
  return envVar;
}

module.exports = {
  pluginOptions: {
    electronBuilder: {
      chainWebpackMainProcess: config => {
        config.plugin('define').tap(args => {
          Object.assign(args[0], {
            NODE_URL: getEnv('REGIUSMARK_NODE_URL', IS_SPECTRON ? 'ws://localhost:7777' : undefined),
          });
          return args;
        });
      },
      mainProcessFile: './src/background/index.ts',
      mainProcessWatch: ['./src/background'],
      builderOptions: {
        artifactName: '${name}-${version}-${os}-x64.${ext}',
        productName: 'Regius Mark Wallet',
        mac: {
          category: 'public.app-category.finance',
          forceCodeSigning: FORCE_CODE_SIGNING,
          identity: 'Regius Mark',
        },
        win: {
          forceCodeSigning: FORCE_CODE_SIGNING,
          target: [{ target: 'nsis', arch: ['x64'] }],
        },
        linux: {
          category: 'Finance',
          target: [
            { target: 'AppImage', arch: ['x64'] },
            { target: 'zip', arch: ['x64'] },
          ],
        },
      },
    },
  },
};
