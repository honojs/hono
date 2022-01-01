const fetch = require('node-fetch')
const { Hono, Middleware } = require('../hono')

describe('Powered by Middleware', () => {
  const app = new Hono()

  app.use('*', Middleware.poweredBy)
  app.get('/', () => new fetch.Response('root'))

  it('Response headers include X-Powered-By', async () => {
    let req = new fetch.Request('https://example.com/')
    let res = await app.dispatch(req, new fetch.Response())
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Powered-By')).toBe('Hono')
  })
})
