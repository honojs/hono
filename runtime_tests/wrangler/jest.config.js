export default {
  testMatch: ['**/runtime_tests/wrangler/**/(*.)+(test).+(ts|tsx)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testPathIgnorePatterns: ['jest.config.js'],
}
