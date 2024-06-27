import { Context } from '../../context'
import { getConnInfo } from './conninfo'

const createRandomBunServer = () => {
  const address = Math.random().toString()
  const port = Math.floor(Math.random() * (65535 + 1))
  return {
    address,
    port,
    server: {
      requestIP() {
        return {
          address,
          family: 'IPv6',
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
