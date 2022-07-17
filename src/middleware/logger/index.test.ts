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
  })

  it('Log status 200 with empty body', async () => {
    const res = await app.request('http://localhost/empty')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('  --> GET /empty \x1b[32m200\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 200 with small body', async () => {
    const res = await app.request('http://localhost/short')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('  --> GET /short \x1b[32m200\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Log status 200 with big body', async () => {
    const res = await app.request('http://localhost/long')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('  --> GET /long \x1b[32m200\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })

  it('Time in seconds', async () => {
    const res = await app.request('http://localhost/seconds')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('  --> GET /seconds \x1b[32m200\x1b[0m')).toBe(true)
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
    expect(log.startsWith('  --> GET /notfound \x1b[33m404\x1b[0m')).toBe(true)
    expect(log).toMatch(/m?s$/)
  })
})
