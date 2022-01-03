const fetch = require('node-fetch')
const { Hono, Middleware } = require('../hono')

describe('Logger by Middleware', () => {
  const app = new Hono()

  let log = ''
  const logFn = (str) => {
    log = str
  }

  app.use('*', Middleware.logger(logFn))
  app.get('/', () => new fetch.Response('root'))

  it('Log status 200', async () => {
    const req = new fetch.Request('https://example.com/')
    const res = await app.dispatch(req, new fetch.Response())
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('  --> GET / \x1b[32m200\x1b[0m')).toBe(true)
  })

  it('Log status 404', async () => {
    app.notFound = () => {
      return new fetch.Response('Default 404 Nout Found', { status: 404 })
    }

    const req = new fetch.Request('https://example.com/notfound')
    const res = await app.dispatch(req, new fetch.Response())
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(log.startsWith('  --> GET /notfound \x1b[33m404\x1b[0m')).toBe(true)
  })
})
