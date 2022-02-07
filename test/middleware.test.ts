import { Hono } from '../src/hono'
import { poweredBy } from '../src/middleware/powered-by/powered-by'

describe('Builtin Middleware', () => {
  const app = new Hono()

  app.use('*', poweredBy())
  app.get('/', () => new Response('root'))

  it('Builtin Powered By Middleware', async () => {
    const req = new Request('http://localhost/')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Powered-By')).toBe('Hono')
  })
})
