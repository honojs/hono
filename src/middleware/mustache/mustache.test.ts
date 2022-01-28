import { Hono } from '../../hono'
import { Middleware } from '../../middleware'

describe('Mustache by Middleware', () => {
  const app = new Hono()

  app.use('*', Middleware.mustache())
  app.get('/', (c) => {
    return c.render('index', {})
  })

  it('Mustache template redering', async () => {
    const req = new Request('http://localhost/')
    /*
    Tests for KV for Workers Site does not work yet.
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    */
  })
})
