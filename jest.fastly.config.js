export default {
  testMatch: ['**/fastly_test/**/*.+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  preset: 'jest-preset-fastly-js-compute/typescript/esm',
}
