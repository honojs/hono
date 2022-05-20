module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2021,
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import'],
  globals: {
    fetch: false,
    Response: false,
    Request: false,
    addEventListener: false,
  },
  rules: {
    quotes: ['error', 'single'],
    semi: ['error', 'never'],
    'no-debugger': ['error'],
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-process-exit': 'off',
    'no-useless-escape': 'off',
    'prefer-const': [
      'warn',
      {
        destructuring: 'all',
      },
    ],
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          Function: false,
        },
      },
    ],
    'sort-imports': 0,
    'import/order': [2, { alphabetize: { order: 'asc' } }],
    'node/no-missing-import': 'off',
    'node/no-missing-require': 'off',
    'node/no-deprecated-api': 'off',
    'node/no-unpublished-import': 'off',
    'node/no-unpublished-require': 'off',
    'node/no-unsupported-features/es-syntax': 'off',

    /*
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/await-thenable': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/restrict-plus-operands': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-for-in-array': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    */
  },
}
