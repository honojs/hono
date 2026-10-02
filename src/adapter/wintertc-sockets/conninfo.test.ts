import { Context } from '../../context'
import { getConnInfo } from './conninfo'
import type { SocketInfo } from './types'

const createContext = (info?: SocketInfo) =>
  new Context(new Request('http://localhost/'), {
    env: { socket: {}, info },
  })

describe('getConnInfo', () => {
  it('Should parse an IPv4 address with a port', () => {
    expect(getConnInfo(createContext({ remoteAddress: '192.0.2.1:4321' }))).toEqual({
      remote: { transport: 'tcp', address: '192.0.2.1', addressType: 'IPv4', port: 4321 },
    })
  })

  it('Should parse a bracketed IPv6 address with a port', () => {
    expect(getConnInfo(createContext({ remoteAddress: '[::1]:8080' }))).toEqual({
      remote: { transport: 'tcp', address: '::1', addressType: 'IPv6', port: 8080 },
    })
  })

  it('Should parse an IPv6 address without a port', () => {
    expect(getConnInfo(createContext({ remoteAddress: '2001:db8::1' }))).toEqual({
      remote: { transport: 'tcp', address: '2001:db8::1', addressType: 'IPv6' },
    })
  })

  it('Should leave the address type undefined for a host name', () => {
    expect(getConnInfo(createContext({ remoteAddress: 'example.com:80' }))).toEqual({
      remote: { transport: 'tcp', address: 'example.com', addressType: undefined, port: 80 },
    })
  })

  it('Should return empty remote info without a remote address', () => {
    expect(getConnInfo(createContext())).toEqual({ remote: {} })
    expect(getConnInfo(createContext({ remoteAddress: null }))).toEqual({ remote: {} })
    expect(getConnInfo(new Context(new Request('http://localhost/')))).toEqual({ remote: {} })
  })
})
