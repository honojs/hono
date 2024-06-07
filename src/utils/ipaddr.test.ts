import { convertIPv4ToBinary, convertIPv6ToBinary, distinctRemoteAddr, expandIPv6 } from './ipaddr'

describe('expandIPv6', () => {
  it('Should result be valid', () => {
    expect(expandIPv6('1::1')).toBe('0001:0000:0000:0000:0000:0000:0000:0001')
    expect(expandIPv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001')
    expect(expandIPv6('2001:2::')).toBe('2001:0002:0000:0000:0000:0000:0000:0000')
    expect(expandIPv6('2001:2::')).toBe('2001:0002:0000:0000:0000:0000:0000:0000')
    expect(expandIPv6('2001:0:0:db8::1')).toBe('2001:0000:0000:0db8:0000:0000:0000:0001')
  })
})
describe('distinctRemoteAddr', () => {
  it('Should result be valud', () => {
    expect(distinctRemoteAddr('1::1')).toBe('IPv6')
    expect(distinctRemoteAddr('::1')).toBe('IPv6')

    expect(distinctRemoteAddr('192.168.2.0')).toBe('IPv4')
    expect(distinctRemoteAddr('192.168.2.0')).toBe('IPv4')

    expect(distinctRemoteAddr('example.com')).toBe('unknown')
  })
})

describe('convertIPv4ToBinary', () => {
  it('Should result is valid', () => {
    expect(convertIPv4ToBinary('0.0.0.0')).toBe(0n)
    expect(convertIPv4ToBinary('0.0.0.1')).toBe(1n)

    expect(convertIPv4ToBinary('0.0.1.0')).toBe(1n << 8n)
  })
})
describe('convertIPv6ToBinary', () => {
  it('Should result is valid', () => {
    expect(convertIPv6ToBinary('::0')).toBe(0n)
    expect(convertIPv6ToBinary('::1')).toBe(1n)

    expect(convertIPv6ToBinary('::f')).toBe(15n)
  })
})
