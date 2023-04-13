module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jest'],
  rules: {
    "no-console": "off",
    "no-control-regex": "off",
    "promise/no-native": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/prefer-await-to-then": "off",
    "promise/catch-or-return": "off",
    "space-before-function-paren": "off"
  },
  env: {
    node: true,
    jest: true,
  },
  root: true,
};
