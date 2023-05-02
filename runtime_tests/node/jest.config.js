export default {
  testMatch: ['**/runtime_tests/node/**/*.+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testPathIgnorePatterns: ['jest.config.js'],
}
