import { Hono } from '../../hono'
import { endTime, setMetric, startTime, timing } from '.'

describe('Server-Timing API', () => {
  const app = new Hono()

  const totalDescription = 'my total DescRipTion!'
  const name = 'sleep'
  const region = 'region'
  const regionDesc = 'europe-west3'

  app.use(
    '*',
    timing({
      totalDescription,
    })
  )
  app.get('/', (c) => c.text('/'))
  app.get('/api', async (c) => {
    startTime(c, name)
    await new Promise((r) => setTimeout(r, 30))
    endTime(c, name)

    return c.text('api!')
  })
  app.get('/cache', async (c) => {
    setMetric(c, region, regionDesc)

    return c.text('cache!')
  })

  const sub = new Hono()

  sub.use(timing())
  sub.get('/', (c) => c.text('sub'))
  app.route('/sub', sub)

  it('Should contain total duration', async () => {
    const res = await app.request('http://localhost/')
    expect(res).not.toBeNull()
    expect(res.headers.has('server-timing')).toBeTruthy()
    expect(res.headers.get('server-timing')?.includes('total;dur=')).toBeTruthy()
    expect(res.headers.get('server-timing')?.includes(totalDescription)).toBeTruthy()
  })

  it('Should contain value metrics', async () => {
    const res = await app.request('http://localhost/api')
    expect(res).not.toBeNull()
    expect(res.headers.has('server-timing')).toBeTruthy()
    expect(res.headers.get('server-timing')?.includes(`${name};dur=`)).toBeTruthy()
    expect(res.headers.get('server-timing')?.includes(name)).toBeTruthy()
  })

  it('Should contain value-less metrics', async () => {
    const res = await app.request('http://localhost/cache')
    expect(res).not.toBeNull()
    expect(res.headers.has('server-timing')).toBeTruthy()
    expect(
      res.headers.get('server-timing')?.includes(`${region};desc="${regionDesc}"`)
    ).toBeTruthy()
    expect(res.headers.get('server-timing')?.includes(region)).toBeTruthy()
    expect(res.headers.get('server-timing')?.includes(regionDesc)).toBeTruthy()
  })

  it('Should not be enabled if the main app has the timing middleware', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn')
    const res = await app.request('/sub')
    expect(res.status).toBe(200)
    expect(res.headers.has('server-timing')).toBeTruthy()
    expect(res.headers.get('server-timing')?.includes(totalDescription)).toBeTruthy()
    expect(consoleWarnSpy).not.toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  describe('Should handle crossOrigin setting', async () => {
    it('Should do nothing when crossOrigin is falsy', async () => {
      const crossOriginApp = new Hono()

      crossOriginApp.use(
        '*',
        timing({
          crossOrigin: false,
        })
      )

      crossOriginApp.get('/', (c) => c.text('/'))

      const res = await crossOriginApp.request('http://localhost/')

      expect(res).not.toBeNull()
      expect(res.headers.has('server-timing')).toBeTruthy()
      expect(res.headers.has('timing-allow-origin')).toBeFalsy()
    })

    it('Should set Timing-Allow-Origin to * when crossOrigin is true', async () => {
      const crossOriginApp = new Hono()

      crossOriginApp.use(
        '*',
        timing({
          crossOrigin: true,
        })
      )

      crossOriginApp.get('/', (c) => c.text('/'))

      const res = await crossOriginApp.request('http://localhost/')

      expect(res).not.toBeNull()
      expect(res.headers.has('server-timing')).toBeTruthy()
      expect(res.headers.has('timing-allow-origin')).toBeTruthy()
      expect(res.headers.get('timing-allow-origin')).toBe('*')
    })

    it('Should set Timing-Allow-Origin to the value of crossOrigin when it is a string', async () => {
      const crossOriginApp = new Hono()

      crossOriginApp.use(
        '*',
        timing({
          crossOrigin: 'https://example.com',
        })
      )

      crossOriginApp.get('/', (c) => c.text('/'))

      const res = await crossOriginApp.request('http://localhost/')

      expect(res).not.toBeNull()
      expect(res.headers.has('server-timing')).toBeTruthy()
      expect(res.headers.has('timing-allow-origin')).toBeTruthy()
      expect(res.headers.get('timing-allow-origin')).toBe('https://example.com')
    })

    it('Should set Timing-Allow-Origin to the return value of crossOrigin when it is a function', async () => {
      const crossOriginApp = new Hono()

      crossOriginApp.use(
        '*',
        timing({
          crossOrigin: (c) => c.req.header('origin') ?? '*',
        })
      )

      crossOriginApp.get('/', (c) => c.text('/'))

      const res = await crossOriginApp.request('http://localhost/', {
        headers: {
          origin: 'https://example.com',
        },
      })

      expect(res).not.toBeNull()
      expect(res.headers.has('server-timing')).toBeTruthy()
      expect(res.headers.has('timing-allow-origin')).toBeTruthy()
      expect(res.headers.get('timing-allow-origin')).toBe('https://example.com')
    })
  })
})
