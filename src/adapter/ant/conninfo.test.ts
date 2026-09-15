import { Context } from '../../context'
import { getConnInfo } from './conninfo'

const createAntServer = ({
  address = '127.0.0.1',
  port = Math.floor(Math.random() * (65535 + 1)),
}: {
  address?: string
  port?: number
} = {}) => {
  return {
    address,
    port,
    server: {
      requestIP() {
        return {
          address,
          port,
        }
      },
    },
  }
}

describe('getConnInfo', () => {
  it('Should info is valid', () => {
    const { port, server, address } = createAntServer()
    const c = new Context(new Request('http://localhost/'), { env: server })
    const info = getConnInfo(c)

    expect(info.remote.port).toBe(port)
    expect(info.remote.address).toBe(address)
    expect(info.remote.addressType).toBe('IPv4')
    expect(info.remote.transport).toBeUndefined()
  })
  it('Should getConnInfo works when env is { server: server }', () => {
    const { port, server, address } = createAntServer()
    const c = new Context(new Request('http://localhost/'), { env: { server } })

    const info = getConnInfo(c)

    expect(info.remote.port).toBe(port)
    expect(info.remote.address).toBe(address)
    expect(info.remote.addressType).toBe('IPv4')
  })
  it('Should detect IPv6 addresses', () => {
    const { server } = createAntServer({ address: '::1' })
    const c = new Context(new Request('http://localhost/'), { env: server })

    expect(getConnInfo(c).remote.addressType).toBe('IPv6')
  })
  it('Should return undefined addressType for other addresses', () => {
    const { server } = createAntServer({ address: 'localhost' })
    const c = new Context(new Request('http://localhost/'), { env: server })

    expect(getConnInfo(c).remote.addressType).toBeUndefined()
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
  it('Should return empty remote when requestIP returns null', () => {
    const c = new Context(new Request('http://localhost/'), {
      env: {
        requestIP() {
          return null
        },
      },
    })

    const info = getConnInfo(c)

    expect(info.remote).toEqual({})
  })
})
