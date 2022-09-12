import { validator } from './validator'

describe('Test the validator rules', () => {
  test('required', () => {
    expect(validator.required('a')).toBeTruthy()
  })

  test('optional', () => {
    expect(validator.optional).toBeTruthy()
  })

  test('isAlpha', () => {
    expect(validator.isAlpha('abcdef')).toBeTruthy()
    expect(validator.isAlpha('abc123')).toBeFalsy()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(validator.isAlpha(123)).toBeFalsy()
  })

  test('isNumeric', () => {
    expect(validator.isNumeric('01234')).toBeTruthy()
    expect(validator.isNumeric('012abc')).toBeFalsy()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(validator.isAlpha(123)).toBeFalsy()
  })

  test('isEmpty', () => {
    expect(validator.isEmpty('')).toBeTruthy()
    expect(validator.isEmpty(' ')).toBeFalsy()
    expect(validator.isEmpty(' ', { ignore_whitespace: true })).toBeTruthy()
    expect(validator.isEmpty('abc')).toBeFalsy()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(validator.isEmpty(123, { ignore_whitespace: true })).toBeFalsy()
  })

  test('isLength', () => {
    expect(validator.isLength('abcde', { min: 1, max: 10 })).toBeTruthy()
    expect(validator.isLength('abcde', { min: 1, max: 4 })).toBeFalsy()
    expect(validator.isLength('abcde', { max: 10 })).toBeTruthy()
    expect(validator.isLength('abcde', { max: 4 })).toBeFalsy()
    expect(validator.isLength('abcde', { min: 10 })).toBeFalsy()
    expect(validator.isLength('abcde', { min: 4 })).toBeTruthy()
    expect(validator.isLength('abcde', 1, 10)).toBeTruthy()
    expect(validator.isLength('abcde', 1, 4)).toBeFalsy()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(validator.isLength(123, { max: 10 })).toBeFalsy()
  })

  test('contains', () => {
    expect(validator.contains('barfoobaz', 'foo')).toBeTruthy()
    expect(validator.contains('barfoobaz', 'fooo')).toBeFalsy()
    expect(validator.contains('barfoobaz', 'Foo')).toBeFalsy()
    expect(validator.contains('barfoobaz', 'Foo', { ignoreCase: true })).toBeTruthy()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(validator.contains(12345, 123)).toBeFalsy()
  })

  test('equals', () => {
    expect(validator.equals('foo', 'foo')).toBeTruthy()
    expect(validator.equals('foo', 'bar')).toBeFalsy()
  })

  test('isIn', () => {
    expect(validator.isIn('foo', ['foo', 'bar'])).toBeTruthy()
    expect(validator.isIn('foo', ['zzz', 'yyy'])).toBeFalsy()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(validator.isIn(123, [123, 456])).toBeFalsy()
  })

  test('trim', () => {
    expect(validator.trim(' foo ')).toBe('foo')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(validator.trim(123)).toBe(123)
  })
})
