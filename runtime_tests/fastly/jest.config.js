export default {
  testMatch: ['**/runtime_tests/fastly/**/*.+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  preset: 'jest-preset-fastly-js-compute/typescript/esm',
  testPathIgnorePatterns: ['jest.config.js'],
}
