import { sanitizer } from './sanitizer'

describe('Sanitizers', () => {
  test('trim', () => {
    expect(sanitizer.trim(' abc  ')).toBe('abc')
  })
})
