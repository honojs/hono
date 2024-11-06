import { Hono } from '../../hono'
import { logger } from '.'

describe('Logger by Middleware', () => {
  let app: Hono
  let log: string

  beforeEach(() => {
    function sleep(time: number) {
      return new Promise((resolve) => setTimeout(resolve, time))
    }

    app = new Hono()

    const logFn = (str: string) => {
      log = str
    }

    const shortRandomString = 'hono'
    const longRandomString = 'hono'.repeat(1000)

    app.use('*', logger(logFn))
    app.get('/short', (c) => c.text(shortRandomString))
    app.get('/long', (c) => c.text(longRandomString))
    app.get('/seconds', async (c) => {
      await sleep(1000)

      return c.text(longRandomString)
    })
    app.get('/empty', (c) => c.text(''))
    app.get('/redirect', (c) => {
      return c.redirect('/empty', 301)
    })
    app.get('/server-error', (c) => {
      const res = new Response('', { status: 511 })
      if (c.req.query('status')) {
        // test status code not yet supported by runtime `Response` object
        Object.defineProperty(res, 'status', { value: parseInt(c.req.query('status') as string) })
      }
      return res
    })
  })

  it('Log status 200 with empty body', async () => {
    const res = await app.request('http://localhost/empty')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('--> GET /empty \x1b[32m200\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 200 with small body', async () => {
    const res = await app.request('http://localhost/short')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('--> GET /short \x1b[32m200\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 200 with big body', async () => {
    const res = await app.request('http://localhost/long')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('--> GET /long \x1b[32m200\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Time in seconds', async () => {
    const res = await app.request('http://localhost/seconds')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('--> GET /seconds \x1b[32m200\x1b[0m')).toBe(true)
    expect(log).toMatch(/1s/)
  })

  it('Log status 301 with empty body', async () => {
    const res = await app.request('http://localhost/redirect')
    expect(res).not.toBeNull()
    expect(res.status).toBe(301)
    expect(log.startsWith('--> GET /redirect \x1b[36m301\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 404', async () => {
    const msg = 'Default 404 Not Found'
    app.all('*', (c) => {
      return c.text(msg, 404)
    })
    const res = await app.request('http://localhost/notfound')
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(log.startsWith('--> GET /notfound \x1b[33m404\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 511 with empty body', async () => {
    const res = await app.request('http://localhost/server-error')
    expect(res).not.toBeNull()
    expect(res.status).toBe(511)
    expect(log.startsWith('--> GET /server-error \x1b[31m511\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 100', async () => {
    const res = await app.request('http://localhost/server-error?status=100')
    expect(res).not.toBeNull()
    expect(res.status).toBe(100)
    expect(log.startsWith('--> GET /server-error 100')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 700', async () => {
    const res = await app.request('http://localhost/server-error?status=700')
    expect(res).not.toBeNull()
    expect(res.status).toBe(700)
    expect(log.startsWith('--> GET /server-error 700')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })
})

describe('Logger by Middleware in NO_COLOR', () => {
  let app: Hono
  let log: string

  beforeEach(() => {
    vi.stubEnv('NO_COLOR', '1')
    function sleep(time: number) {
      return new Promise((resolve) => setTimeout(resolve, time))
    }

    app = new Hono()

    const logFn = (str: string) => {
      log = str
    }

    const shortRandomString = 'hono'
    const longRandomString = 'hono'.repeat(1000)

    app.use('*', logger(logFn))
    app.get('/short', (c) => c.text(shortRandomString))
    app.get('/long', (c) => c.text(longRandomString))
    app.get('/seconds', async (c) => {
      await sleep(1000)

      return c.text(longRandomString)
    })
    app.get('/empty', (c) => c.text(''))
  })
  afterAll(() => {
    vi.unstubAllEnvs()
  })
  it('Log status 200 with empty body', async () => {
    const res = await app.request('http://localhost/empty')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('--> GET /empty 200')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 200 with small body', async () => {
    const res = await app.request('http://localhost/short')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('--> GET /short 200')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 200 with big body', async () => {
    const res = await app.request('http://localhost/long')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('--> GET /long 200')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Time in seconds', async () => {
    const res = await app.request('http://localhost/seconds')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('--> GET /seconds 200')).toBe(true)
    expect(log).toMatch(/1s/)
  })

  it('Log status 404', async () => {
    const msg = 'Default 404 Not Found'
    app.all('*', (c) => {
      return c.text(msg, 404)
    })
    const res = await app.request('http://localhost/notfound')
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(log.startsWith('--> GET /notfound 404')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })
})
