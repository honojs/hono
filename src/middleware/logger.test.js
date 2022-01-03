const { makeEdgeEnv } = require('edge-mock')
const { Hono, Middleware } = require('../hono')

makeEdgeEnv()

describe('Logger by Middleware', () => {
  const app = new Hono()

  let log = ''
  const logFn = (str) => {
    log = str
  }

  app.use('*', Middleware.logger(logFn))
  app.get('/', () => new Response('root'))

  it('Log status 200', async () => {
    const req = new Request('/')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(log.startsWith('  --> GET / \x1b[32m200\x1b[0m')).toBe(true)
  })

  it('Log status 404', async () => {
    app.notFound = () => {
      return new Response('Default 404 Nout Found', { status: 404 })
    }

    const req = new Request('/notfound')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(log.startsWith('  --> GET /notfound \x1b[33m404\x1b[0m')).toBe(true)
  })
})
