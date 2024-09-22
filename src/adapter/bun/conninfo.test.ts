import { Context } from '../../context'
import type { AddressType } from '../../helper/conninfo'
import { getConnInfo } from './conninfo'

const createRandomBunServer = ({
  address = Math.random().toString(),
  port = Math.floor(Math.random() * (65535 + 1)),
  family = 'IPv6',
}: {
  address?: string
  port?: number
  family?: AddressType | string
} = {}) => {
  return {
    address,
    port,
    server: {
      requestIP() {
        return {
          address,
          family,
          port,
        }
      },
    },
  }
}
describe('getConnInfo', () => {
  it('Should info is valid', () => {
    const { port, server, address } = createRandomBunServer()
    const c = new Context(new Request('http://localhost/'), { env: server })
    const info = getConnInfo(c)

    expect(info.remote.port).toBe(port)
    expect(info.remote.address).toBe(address)
    expect(info.remote.addressType).toBe('IPv6')
    expect(info.remote.transport).toBeUndefined()
  })
  it('Should getConnInfo works when env is { server: server }', () => {
    const { port, server, address } = createRandomBunServer()
    const c = new Context(new Request('http://localhost/'), { env: { server } })

    const info = getConnInfo(c)

    expect(info.remote.port).toBe(port)
    expect(info.remote.address).toBe(address)
    expect(info.remote.addressType).toBe('IPv6')
    expect(info.remote.transport).toBeUndefined()
  })
  it('should return undefined when addressType is invalid string', () => {
    const { server } = createRandomBunServer({ family: 'invalid' })
    const c = new Context(new Request('http://localhost/'), { env: { server } })

    const info = getConnInfo(c)

    expect(info.remote.addressType).toBeUndefined()
  })
  it('Should throw error when user did not give server', () => {
    const c = new Context(new Request('http://localhost/'), { env: {} })

    expect(() => getConnInfo(c)).toThrowError(TypeError)
  })
  it('Should throw error when requestIP is not function', () => {
    const c = new Context(new Request('http://localhost/'), {
      env: {
        requestIP: 0,
      },
    })
    expect(() => getConnInfo(c)).toThrowError(TypeError)
  })
})
