import { Context } from '../../context'
import { getConnInfo } from './conninfo'

describe('getConnInfo', () => {
  it('Should return the client IP from context.ip', () => {
    const ip = '203.0.113.50'
    const c = new Context(new Request('http://localhost/'), {
      env: {
        context: {
          ip,
        },
      },
    })

    const info = getConnInfo(c)

    expect(info.remote.address).toBe(ip)
  })

  it('Should return undefined when context.ip is not present', () => {
    const c = new Context(new Request('http://localhost/'), {
      env: {
        context: {},
      },
    })

    const info = getConnInfo(c)

    expect(info.remote.address).toBeUndefined()
  })

  it('Should return undefined when context is not present', () => {
    const c = new Context(new Request('http://localhost/'), {
      env: {},
    })

    const info = getConnInfo(c)

    expect(info.remote.address).toBeUndefined()
  })
})
