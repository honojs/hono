export const assertEquals = (actual: unknown, expected: unknown): void => {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

export const assertMatch = (actual: string, expected: RegExp): void => {
  if (!expected.test(actual)) {
    throw new Error(`Expected ${JSON.stringify(actual)} to match ${expected}`)
  }
}
