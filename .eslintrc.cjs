module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  rules: {
    'no-control-regex': 'off',
  },
  env: {
    node: true,
    es2020: true,
  },
  overrides: [
    {
      files: ['*.ts'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      plugins: ['@typescript-eslint'],
      parser: '@typescript-eslint/parser',
      rules: {
        'no-control-regex': 'off',
      },
    },
    {
      files: ['tests/**/*.js'],
      plugins: ['jest'],
      env: {
        jest: true,
      },
    },
  ],
};
