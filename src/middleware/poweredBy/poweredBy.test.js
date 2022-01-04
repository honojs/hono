const { makeEdgeEnv } = require('edge-mock')
const { Hono, Middleware } = require('../../hono')

makeEdgeEnv()

describe('Powered by Middleware', () => {
  const app = new Hono()

  app.use('*', Middleware.poweredBy)
  app.get('/', () => new Response('root'))

  it('Response headers include X-Powered-By', async () => {
    let req = new Request('/')
    let res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Powered-By')).toBe('Hono')
  })
})
