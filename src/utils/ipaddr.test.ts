import {
  convertIPv4BinaryToString,
  convertIPv4ToBinary,
  convertIPv6BinaryToString,
  convertIPv6ToBinary,
  distinctRemoteAddr,
  expandIPv6,
} from './ipaddr'

describe('expandIPv6', () => {
  it('Should result be valid', () => {
    expect(expandIPv6('1::1')).toBe('0001:0000:0000:0000:0000:0000:0000:0001')
    expect(expandIPv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001')
    expect(expandIPv6('2001:2::')).toBe('2001:0002:0000:0000:0000:0000:0000:0000')
    expect(expandIPv6('2001:2::')).toBe('2001:0002:0000:0000:0000:0000:0000:0000')
    expect(expandIPv6('2001:0:0:db8::1')).toBe('2001:0000:0000:0db8:0000:0000:0000:0001')
    expect(expandIPv6('::ffff:127.0.0.1')).toBe('0000:0000:0000:0000:0000:ffff:7f00:0001')
  })
})
describe('distinctRemoteAddr', () => {
  it('Should result be valid', () => {
    expect(distinctRemoteAddr('1::1')).toBe('IPv6')
    expect(distinctRemoteAddr('::1')).toBe('IPv6')
    expect(distinctRemoteAddr('::ffff:127.0.0.1')).toBe('IPv6')

    expect(distinctRemoteAddr('192.168.2.0')).toBe('IPv4')
    expect(distinctRemoteAddr('192.168.2.0')).toBe('IPv4')

    expect(distinctRemoteAddr('example.com')).toBeUndefined()
  })

  it('Should reject invalid IPv4 addresses with octets > 255', () => {
    expect(distinctRemoteAddr('1.2.3.256')).toBeUndefined()
    expect(distinctRemoteAddr('1.2.3.999')).toBeUndefined()
    expect(distinctRemoteAddr('1.2.2.355')).toBeUndefined()
    expect(distinctRemoteAddr('256.0.0.1')).toBeUndefined()
    expect(distinctRemoteAddr('999.999.999.999')).toBeUndefined()
  })

  it('Should accept valid IPv4 edge cases', () => {
    expect(distinctRemoteAddr('0.0.0.0')).toBe('IPv4')
    expect(distinctRemoteAddr('255.255.255.255')).toBe('IPv4')
    expect(distinctRemoteAddr('1.2.3.4')).toBe('IPv4')
  })
})

describe('convertIPv4ToBinary', () => {
  it('Should result is valid', () => {
    expect(convertIPv4ToBinary('0.0.0.0')).toBe(0n)
    expect(convertIPv4ToBinary('0.0.0.1')).toBe(1n)

    expect(convertIPv4ToBinary('0.0.1.0')).toBe(1n << 8n)
  })
})

describe('convertIPv4ToString', () => {
  // add tons of test cases here
  test.each`
    input        | expected
    ${'0.0.0.0'} | ${'0.0.0.0'}
    ${'0.0.0.1'} | ${'0.0.0.1'}
    ${'0.0.1.0'} | ${'0.0.1.0'}
  `('convertIPv4ToString($input) === $expected', ({ input, expected }) => {
    expect(convertIPv4BinaryToString(convertIPv4ToBinary(input))).toBe(expected)
  })
})

describe('convertIPv6ToBinary', () => {
  it('Should result is valid', () => {
    expect(convertIPv6ToBinary('::0')).toBe(0n)
    expect(convertIPv6ToBinary('::1')).toBe(1n)

    expect(convertIPv6ToBinary('::f')).toBe(15n)
    expect(convertIPv6ToBinary('1234:::5678')).toBe(24196103360772296748952112894165669496n)
    expect(convertIPv6ToBinary('::ffff:127.0.0.1')).toBe(281472812449793n)
  })
})

describe('convertIPv6ToString', () => {
  // add tons of test cases here
  test.each`
    input                                        | expected
    ${'::1'}                                     | ${'::1'}
    ${'1::'}                                     | ${'1::'}
    ${'1234:::5678'}                             | ${'1234::5678'}
    ${'2001:2::'}                                | ${'2001:2::'}
    ${'2001::db8:0:0:0:0:1'}                     | ${'2001:0:db8::1'}
    ${'1234:5678:9abc:def0:1234:5678:9abc:def0'} | ${'1234:5678:9abc:def0:1234:5678:9abc:def0'}
    ${'::ffff:127.0.0.1'}                        | ${'::ffff:127.0.0.1'}
  `('convertIPv6ToString($input) === $expected', ({ input, expected }) => {
    expect(convertIPv6BinaryToString(convertIPv6ToBinary(input))).toBe(expected)
  })
})
