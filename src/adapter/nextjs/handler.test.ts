import { Hono } from '../../hono'
import { handle } from './handler'

describe('Adapter for Next.js', () => {
  it('Should return 200 response', async () => {
    const app = new Hono()
    app.get('/api/foo', (c) => {
      return c.text('/api/foo')
    })
    const handler = handle(app)
    const req = new Request('http://localhost/api/foo')
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/api/foo')
  })

  it('Should return 200 response with path', async () => {
    const app = new Hono()
    app.get('/foo', (c) => {
      return c.text('/api/foo')
    })
    const handler = handle(app, '/api')
    const req = new Request('http://localhost/api/foo')
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/api/foo')
  })
})
