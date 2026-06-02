import { Hono } from '../../hono'
import { endTime, setMetric, startTime, timing, wrapTime } from '.'

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
  app.get('/api-wrap', async (c) => {
    await wrapTime(c, name, new Promise((r) => setTimeout(r, 30)))

    return c.text('api!')
  })
  app.get('/api-wrap-throw', async (c) => {
    try {
      await wrapTime(c, name, new Promise((_, r) => setTimeout(r, 30)))
    } catch (e) {
      return c.text(`error :( ${e}`, 500)
    }

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

  it('Should contain value metrics, wrapped', async () => {
    const res = await app.request('http://localhost/api-wrap')
    expect(res).not.toBeNull()
    expect(res.headers.has('server-timing')).toBeTruthy()
    expect(res.headers.get('server-timing')?.includes(`${name};dur=`)).toBeTruthy()
    expect(res.headers.get('server-timing')?.includes(name)).toBeTruthy()
  })

  it('Should contain value metrics, wrapped throw', async () => {
    const res = await app.request('http://localhost/api-wrap-throw')
    expect(res).not.toBeNull()
    expect(res.headers.has('server-timing')).toBeTruthy()
    expect(res.status).toBeGreaterThanOrEqual(500)
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

  describe('Should handle timing options', async () => {
    it('Should handle autoEnd option', async () => {
      const autoEndApp = new Hono()

      autoEndApp.use('*', timing())
      autoEndApp.get('/', (c) => {
        startTime(c, 'test')
        return c.text('/')
      })

      const res = await autoEndApp.request('/')

      expect(res.status).toBe(200)
      expect(res.headers.get('server-timing')).toContain('test;dur=')

      const disabledAutoEndApp = new Hono()

      disabledAutoEndApp.use('*', timing({ autoEnd: false }))
      disabledAutoEndApp.get('/', (c) => {
        startTime(c, 'test')
        return c.text('/')
      })

      const disabledRes = await disabledAutoEndApp.request('/')

      expect(disabledRes.status).toBe(200)
      expect(disabledRes.headers.get('server-timing')).not.toContain('test;dur=')
    })

    it('Should use enabled function return value', async () => {
      const enabledApp = new Hono()
      const enabled = vi.fn(() => false)

      enabledApp.use('*', timing({ enabled }))
      enabledApp.get('/', (c) => c.text('/'))

      const res = await enabledApp.request('/')

      expect(res.status).toBe(200)
      expect(enabled).toHaveBeenCalled()
      expect(res.headers.has('server-timing')).toBeFalsy()
    })

    it('Should handle total false and value-less metrics without description', async () => {
      const metricApp = new Hono()

      metricApp.use('*', timing({ total: false }))
      metricApp.get('/', (c) => {
        setMetric(c, 'test')
        return c.text('/')
      })

      const res = await metricApp.request('/')

      expect(res.status).toBe(200)
      expect(res.headers.get('server-timing')).toBe('test')
    })
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

    it("Should use Date.now as backup if performance API isn't available", async () => {
      const originalPerformance = globalThis.performance
      // @ts-expect-error disable performance API for testing
      delete globalThis.performance
      const DateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(123456789)

      const app = new Hono().use(timing()).get('/', (c) => {
        startTime(c, 'test')
        endTime(c, 'test')
        return c.text('hello')
      })

      const res = await app.request('/')
      expect(res.status).toBe(200)

      expect(DateNowSpy).toHaveBeenCalled()

      DateNowSpy.mockRestore()
      globalThis.performance = originalPerformance
    })
  })

  describe('Configuration validation', async () => {
    it('Should silently warn when no timing metrics are available', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const app = new Hono().get('/', (c) => {
        setMetric(c, 'test', 123)
        startTime(c, 'test')
        endTime(c, 'test')
        return c.text('hello')
      })

      const res = await app.request('/')
      expect(res.status).toBe(200)

      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        2,
        'Metrics not initialized! Please add the `timing()` middleware to this route!'
      )

      consoleWarnSpy.mockRestore()
    })

    it('Should silently warn when trying to end a non-existent timer', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const app = new Hono().use(timing()).get('/', (c) => {
        setMetric(c, 'region', 'europe-west3')
        endTime(c, 'nonExistentTimer')
        return c.text('hello')
      })

      const res = await app.request('/')
      expect(res.status).toBe(200)

      expect(consoleWarnSpy).toHaveBeenCalledWith('Timer "nonExistentTimer" does not exist!')

      consoleWarnSpy.mockRestore()
    })
  })
})
