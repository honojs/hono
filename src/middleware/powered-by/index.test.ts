import { Hono } from '@/hono'
import { poweredBy } from '@/middleware/powered-by'

describe('Powered by Middleware', () => {
  const app = new Hono()

  app.use('*', poweredBy())
  app.get('/', () => new Response('root'))

  it('Response headers include X-Powered-By', async () => {
    const req = new Request('http://localhost/')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Powered-By')).toBe('Hono')
  })
})
