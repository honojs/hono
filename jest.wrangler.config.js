export default {
  testMatch: ['**/test_wrangler/**/(*.)+(test).+(ts|tsx)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}
