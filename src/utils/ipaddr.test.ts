import {
  convertIPv4BinaryToString,
  convertIPv4ToBinary,
  convertIPv6BinaryToString,
  convertIPv6ToBinary,
  distinctRemoteAddr,
  expandIPv6,
  INVALID_IP_ADDRESS_ERROR_CODE,
} from './ipaddr'

const expectInvalidIPAddressError = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError)
    expect(error).toHaveProperty('code', INVALID_IP_ADDRESS_ERROR_CODE)
    return
  }
  throw new Error('Expected invalid IP address error')
}

describe('expandIPv6', () => {
  it('Should result be valid', () => {
    expect(expandIPv6('1::1')).toBe('0001:0000:0000:0000:0000:0000:0000:0001')
    expect(expandIPv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001')
    expect(expandIPv6('2001:2::')).toBe('2001:0002:0000:0000:0000:0000:0000:0000')
    expect(expandIPv6('2001:2::')).toBe('2001:0002:0000:0000:0000:0000:0000:0000')
    expect(expandIPv6('2001:0:0:db8::1')).toBe('2001:0000:0000:0db8:0000:0000:0000:0001')
    expect(expandIPv6('::ffff:127.0.0.1')).toBe('0000:0000:0000:0000:0000:ffff:7f00:0001')
  })

  it('Should expand the unspecified address "::" to eight zero groups', () => {
    expect(expandIPv6('::')).toBe('0000:0000:0000:0000:0000:0000:0000:0000')
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

  test.each(['1.2.3.256', '1.2.3', '1.2.3.4.5', '1..3.4', '01.2.3.4', 'a.b.c.d'])(
    'Should throw for invalid IPv4: %s',
    (input) => {
      expectInvalidIPAddressError(() => convertIPv4ToBinary(input))
    }
  )
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
    expect(convertIPv6ToBinary('1234::5678')).toBe(24196103360772296748952112894165669496n)
    expect(convertIPv6ToBinary('::ffff:127.0.0.1')).toBe(281472812449793n)
    expect(convertIPv6ToBinary('fe80::1%eth0')).toBe(convertIPv6ToBinary('fe80::1'))
  })

  test.each([
    '1::2::3',
    '1:2:3:4:5:6:7:8:9',
    '1:2:3:4:5:6:7',
    '12345::',
    'gggg::',
    '::ffff:127.0.0.256',
    '1234:::5678',
    '2001:db8::1%eth0',
    '::ffff:127.0.0.1%eth0',
    '1:2:3%eth0',
    'gggg%eth0',
    'fe80::1%',
  ])('Should throw for invalid IPv6: %s', (input) => {
    expectInvalidIPAddressError(() => convertIPv6ToBinary(input))
  })
})

describe('convertIPv6ToString', () => {
  // add tons of test cases here
  test.each`
    input                                        | expected
    ${'::1'}                                     | ${'::1'}
    ${'1::'}                                     | ${'1::'}
    ${'1234::5678'}                              | ${'1234::5678'}
    ${'2001:2::'}                                | ${'2001:2::'}
    ${'2001::db8:0:0:0:0:1'}                     | ${'2001:0:db8::1'}
    ${'1234:5678:9abc:def0:1234:5678:9abc:def0'} | ${'1234:5678:9abc:def0:1234:5678:9abc:def0'}
    ${'::ffff:127.0.0.1'}                        | ${'::ffff:127.0.0.1'}
    ${'fe80::1%eth0'}                            | ${'fe80::1'}
    ${'1:0:2:3:4:5:6:7'}                         | ${'1:0:2:3:4:5:6:7'}
    ${'0:1:2:3:4:5:6:7'}                         | ${'0:1:2:3:4:5:6:7'}
    ${'1:2:3:4:5:6:7:0'}                         | ${'1:2:3:4:5:6:7:0'}
    ${'1:0:0:2:3:4:5:6'}                         | ${'1::2:3:4:5:6'}
  `('convertIPv6ToString($input) === $expected', ({ input, expected }) => {
    expect(convertIPv6BinaryToString(convertIPv6ToBinary(input))).toBe(expected)
  })
})
