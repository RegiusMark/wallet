module.exports = {
  root: true,
  env: {
    node: true,
  },
  plugins: ['@typescript-eslint'],
  extends: ['plugin:vue/strongly-recommended', '@vue/prettier'],
  rules: {
    'no-console': 'error',
    'no-debugger': 'error',
    'no-undef': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/explicit-function-return-type': 'error',
  },
  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
  overrides: [
    {
      files: ['**/__tests__/*.{j,t}s?(x)'],
      env: {
        jest: true,
      },
    },
  ],
};
