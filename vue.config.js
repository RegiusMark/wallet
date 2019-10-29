module.exports = {
  pluginOptions: {
    electronBuilder: {
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
