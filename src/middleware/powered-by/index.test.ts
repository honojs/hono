import { Hono } from '@/hono'
import { poweredBy } from '@/middleware/powered-by'

describe('Powered by Middleware', () => {
  const app = new Hono()

  app.use('*', poweredBy())
  app.get('/', (c) => c.text('root'))

  it('Should return with X-Powered-By header', async () => {
    const res = await app.request('http://localhost/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Powered-By')).toBe('Hono')
  })
})
