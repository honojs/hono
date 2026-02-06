import { Context } from '../../context'
import { getConnInfo, getGeo } from './conninfo'

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

describe('getGeo', () => {
  it('Should return geo data from context', () => {
    const c = new Context(new Request('http://localhost/'), {
      env: {
        context: {
          geo: {
            city: 'San Francisco',
            country: {
              code: 'US',
              name: 'United States',
            },
            timezone: 'America/Los_Angeles',
          },
        },
      },
    })

    const geo = getGeo(c)

    expect(geo?.city).toBe('San Francisco')
    expect(geo?.country?.code).toBe('US')
    expect(geo?.country?.name).toBe('United States')
    expect(geo?.timezone).toBe('America/Los_Angeles')
  })

  it('Should return undefined when geo data is not present', () => {
    const c = new Context(new Request('http://localhost/'), {
      env: {
        context: {},
      },
    })

    const geo = getGeo(c)

    expect(geo).toBeUndefined()
  })

  it('Should return undefined when context is not present', () => {
    const c = new Context(new Request('http://localhost/'), {
      env: {},
    })

    const geo = getGeo(c)

    expect(geo).toBeUndefined()
  })
})
