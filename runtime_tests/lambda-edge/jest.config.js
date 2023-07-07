export default {
  testMatch: ['**/runtime_tests/lambda-edge/**/*.+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testPathIgnorePatterns: ['jest.config.js'],
}
