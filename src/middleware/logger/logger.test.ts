import { Hono } from '../../hono'
import { Middleware } from '../../middleware'

describe('Logger by Middleware', () => {
  const app = new Hono()

  let log = ''
  const logFn = (str: string) => {
    log = str
  }

  const shortRandomString = 'hono'
  const longRandomString = 'hono'.repeat(1000)

  app.use('*', Middleware.logger(logFn))
  app.get('/short', () => new Response(shortRandomString))
  app.get('/long', () => new Response(longRandomString))
  app.get('/empty', () => new Response(''))

  it('Log status 200 with empty body', async () => {
    const req = new Request('http://localhost/short')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('  --> GET /empty \x1b[32m200\x1b[0m')).toBe(true)
    expect(log.endsWith(' 0b')).toBe(true)
  })

  it('Log status 200 with small body', async () => {
    const req = new Request('http://localhost/short')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('  --> GET /short \x1b[32m200\x1b[0m')).toBe(true)
    expect(log.endsWith(` ${shortRandomString.length}b`)).toBe(true)
  })

  it('Log status 200 with big body', async () => {
    const req = new Request('http://localhost/long')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('  --> GET /long \x1b[32m200\x1b[0m')).toBe(true)
    expect(log.endsWith(` ${longRandomString.length / 1024}kB`)).toBe(true)
  })

  it.only('Log status 404', async () => {
    const msg = 'Default 404 Nout Found'
    app.notFound = () => {
      return new Response(msg, { status: 404 })
    }

    const req = new Request('http://localhost/notfound')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(log.startsWith('  --> GET /notfound \x1b[33m404\x1b[0m')).toBe(true)
    expect(log.endsWith(` ${msg.length}b`)).toBe(true)
  })
})
