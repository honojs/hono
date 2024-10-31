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
      return c.text('', 301, {
        Location: '/empty',
      })
    })
    app.get('/1xx', (c) => {
      return c.text('', 100)
    })
    app.get('/5xx', (c) => {
      return c.text('', 511)
    })
    app.get('/7xx', (c) => {
      return c.text('', 777 as never)
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
    const res = await app.request('http://localhost/5xx')
    expect(res).not.toBeNull()
    expect(res.status).toBe(511)
    expect(log.startsWith('--> GET /5xx \x1b[31m511\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 777 with empty body', async () => {
    const res = await app.request('http://localhost/7xx')
    expect(res).not.toBeNull()
    expect(res.status).toBe(777)
    expect(log.startsWith('--> GET /7xx \x1b[35m200\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 100 with empty body', async () => {
    const res = await app.request('http://localhost/1xx')
    expect(res).not.toBeNull()
    expect(res.status).toBe(100)
    expect(log.startsWith('--> GET /1xx \x1b[35m100\x1b[0m')).toBe(true)
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
