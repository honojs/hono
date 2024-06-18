module.exports = {
  extends: ['@hono/eslint-config'],
  rules: {
    '@typescript-eslint/unbound-method': 'error',
  },
  parserOptions: {
    project: ['./tsconfig.json', './runtime_tests/tsconfig.json'],
  },
}
