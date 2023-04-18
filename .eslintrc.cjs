module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ['src/sauce.config.mjs'],
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
      rules: {
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error'
      }
    },
  ],
};
