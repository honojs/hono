import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { getConnInfo } from './conninfo'

describe('getConnInfo', () => {
  it('Should info is valid', () => {
    const address = Math.random().toString()
    const port = Math.floor(Math.random() * (65535 + 1))
    const c = new Context(new HonoRequest(new Request('/')), {
      env: {
        requestIP() {
          return {
            address,
            family: 'IPv6',
            port,
          }
        },
      },
    })
    const info = getConnInfo(c)

    expect(info.remote.port).toBe(port)
    expect(info.remote.address).toBe(address)
    expect(info.remote.addressType).toBe('IPv6')
    expect(info.remote.transport).toBeUndefined()
  })
})
