export default {
  testMatch: ['**/test/**/*.+(ts|tsx|js)', '**/src/**/(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testEnvironment: 'miniflare',
  testEnvironmentOptions: {
    /*
    bindings: {
      __STATIC_CONTENT: {
        get: (key) => {
          const table = { 'index.abcdef.index': 'This is index' }
          return table[key]
        },
      },
      __STATIC_CONTENT_MANIFEST: JSON.stringify({
        'index.index': 'index.abcdef.index',
      }),
    },
    kvNamespaces: ['TEST_NAMESPACE'],
    */
  },
}
