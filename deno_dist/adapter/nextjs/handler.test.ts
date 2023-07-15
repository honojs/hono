import { Hono } from '../../hono.ts'
import { handle } from './handler.ts'

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

  it('Should not use `route()` if path argument is not passed', async () => {
    const app = new Hono().basePath('/api')

    app.onError((e) => {
      throw e
    })
    app.get('/error', () => {
      throw new Error('Custom Error')
    })

    const handler = handle(app)
    const req = new Request('http://localhost/api/error')
    expect(() => handler(req)).toThrowError('Custom Error')
  })
})
