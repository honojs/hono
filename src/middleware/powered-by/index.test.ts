import { Hono } from '../../hono'
import { poweredBy } from '.'

describe('Powered by Middleware', () => {
  const app = new Hono()

  app.use('/poweredBy/*', poweredBy())
  app.get('/poweredBy', (c) => c.text('root'))

  app.use('/poweredBy2/*', poweredBy())
  app.use('/poweredBy2/*', poweredBy())
  app.get('/poweredBy2', (c) => c.text('root'))

  it('Should return with X-Powered-By header', async () => {
    const res = await app.request('http://localhost/poweredBy')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Powered-By')).toBe('Hono')
  })

  it('Should not return duplicate values', async () => {
    const res = await app.request('http://localhost/poweredBy2')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Powered-By')).toBe('Hono')
  })
})
