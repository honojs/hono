import { rule } from './rule'

describe('Rules', () => {
  // string
  test('isEmpty', () => {
    expect(rule.isEmpty('')).toBeTruthy()
    expect(rule.isEmpty('abcdef')).toBeFalsy()
    expect(rule.isEmpty('')).toBeTruthy()
    expect(rule.isEmpty(' ')).toBeFalsy()
    expect(rule.isEmpty(' ', { ignore_whitespace: true })).toBeTruthy()
  })
  test('isLength', () => {
    expect(rule.isLength('abcde', { min: 1, max: 10 })).toBeTruthy()
    expect(rule.isLength('abcde', { min: 1, max: 4 })).toBeFalsy()
    expect(rule.isLength('abcde', { max: 10 })).toBeTruthy()
    expect(rule.isLength('abcde', { max: 4 })).toBeFalsy()
    expect(rule.isLength('abcde', { min: 10 })).toBeFalsy()
    expect(rule.isLength('abcde', { min: 4 })).toBeTruthy()
    expect(rule.isLength('abcde', 1, 10)).toBeTruthy()
    expect(rule.isLength('abcde', 1, 4)).toBeFalsy()
  })
  test('isAlpha', () => {
    expect(rule.isAlpha('abcdef')).toBeTruthy()
    expect(rule.isAlpha('abc123')).toBeFalsy()
  })
  test('isNumeric', () => {
    expect(rule.isNumeric('01234')).toBeTruthy()
    expect(rule.isNumeric('012abc')).toBeFalsy()
  })
  test('contains', () => {
    expect(rule.contains('barfoobaz', 'foo')).toBeTruthy()
    expect(rule.contains('barfoobaz', 'fooo')).toBeFalsy()
    expect(rule.contains('barfoobaz', 'Foo')).toBeFalsy()
    expect(rule.contains('barfoobaz', 'Foo', { ignoreCase: true })).toBeTruthy()
  })
  test('isIn', () => {
    expect(rule.isIn('foo', ['foo', 'bar'])).toBeTruthy()
    expect(rule.isIn('foo', ['zzz', 'yyy'])).toBeFalsy()
  })
  test('match', () => {
    expect(rule.match('abcdef', /def$/)).toBeTruthy()
    expect(rule.match('abcdef', /^def$/)).toBeFalsy()
  })
  // number
  test('isGte', () => {
    expect(rule.isGte(20, 10)).toBeTruthy()
    expect(rule.isGte(10, 20)).toBeFalsy()
    expect(rule.isGte(10, 10)).toBeTruthy()
  })
  test('isLte', () => {
    expect(rule.isLte(10, 20)).toBeTruthy()
    expect(rule.isLte(20, 10)).toBeFalsy()
    expect(rule.isLte(10, 10)).toBeTruthy()
  })
})
