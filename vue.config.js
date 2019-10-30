function getEnvOrThrow(env) {
  const envVar = JSON.stringify(process.env[env]);
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
            NODE_URL: getEnvOrThrow('GODCOIN_NODE_URL'),
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
