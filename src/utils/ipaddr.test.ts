import { distinctionRemoteAddr, expandIPv6, ipV4ToBinary, ipV6ToBinary } from './ipaddr'

describe('expandIPv6', () => {
  it('Should result be valid', () => {
    expect(expandIPv6('1::1')).toBe('0001:0000:0000:0000:0000:0000:0000:0001')
    expect(expandIPv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001')
    expect(expandIPv6('2001:2::')).toBe('2001:0002:0000:0000:0000:0000:0000:0000')
    expect(expandIPv6('2001:2::')).toBe('2001:0002:0000:0000:0000:0000:0000:0000')
    expect(expandIPv6('2001:0:0:db8::1')).toBe('2001:0000:0000:0db8:0000:0000:0000:0001')
  })
})
describe('distinctionRemoteAddr', () => {
  it('Should result be valud', () => {
    expect(distinctionRemoteAddr('1::1')).toBe('IPv6')
    expect(distinctionRemoteAddr('::1')).toBe('IPv6')

    expect(distinctionRemoteAddr('192.168.2.0')).toBe('IPv4')
    expect(distinctionRemoteAddr('192.168.2.0')).toBe('IPv4')

    expect(distinctionRemoteAddr('example.com')).toBe('unknown')
  })
})

describe('ipV4ToBinary', () => {
  it('Should result is valid', () => {
    expect(ipV4ToBinary('0.0.0.0')).toBe(0n)
    expect(ipV4ToBinary('0.0.0.1')).toBe(1n)

    expect(ipV4ToBinary('0.0.1.0')).toBe(1n << 8n)
  })
})
describe('ipV6ToBinary', () => {
  it('Should result is valid', () => {
    expect(ipV6ToBinary('::0')).toBe(0n)
    expect(ipV6ToBinary('::1')).toBe(1n)

    expect(ipV6ToBinary('::f')).toBe(15n)
  })
})
