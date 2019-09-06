module.exports = {
  pluginOptions: {
    electronBuilder: {
      mainProcessFile: './src/background/index.ts',
      mainProcessWatch: ['./src/background'],
    },
  },
};
