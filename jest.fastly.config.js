export default {
  testMatch: ['**/test_fastly/**/*.+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  preset: 'jest-preset-fastly-js-compute/typescript/esm',
}
