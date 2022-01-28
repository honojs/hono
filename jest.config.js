module.exports = {
  testMatch: ['**/test/**/*.+(ts|tsx|js)', '**/src/**/(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testPathIgnorePatterns: ['./example'],
  testEnvironment: 'miniflare',
  testEnvironmentOptions: {
    bindings: {
      __STATIC_CONTENT: {
        get: (key) => {
          const table = { 'index.abcdef.mustache': 'This is index' }
          return table[key]
        },
      },
      __STATIC_CONTENT_MANIFEST: JSON.stringify({
        'index.mustache': 'index.abcdef.mustache',
      }),
    },
    // kvNamespaces: ['TEST_NAMESPACE'],
  },
}
