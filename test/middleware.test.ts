import { Hono, Middleware } from '../src/hono'

describe('Builtin Middleware', () => {
  const app = new Hono()

  app.use('*', Middleware.poweredBy())
  app.get('/', () => new Response('root'))

  it('Builtin Powered By Middleware', async () => {
    const req = new Request('http://localhost/')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Powered-By')).toBe('Hono')
  })
})
