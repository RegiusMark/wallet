const assert = require('assert');

const IS_SPECTRON = process.env.IS_SPECTRON === '1';

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
            NODE_URL: getEnv('GODCOIN_NODE_URL', IS_SPECTRON ? 'ws://localhost:7777' : undefined),
          });
          return args;
        });
      },
      mainProcessFile: './src/background/index.ts',
      mainProcessWatch: ['./src/background'],
      builderOptions: {
        productName: 'GODcoin Wallet',
        mac: {
          identity: 'GODcoin',
        },
      },
    },
  },
};
