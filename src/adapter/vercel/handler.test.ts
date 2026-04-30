import { Hono } from '../../hono'
import { handle } from './handler'

describe('Adapter for Next.js', () => {
  it('Should return 200 response', async () => {
    const app = new Hono()
    app.get('/api/author/:name', async (c) => {
      const name = c.req.param('name')
      return c.json({
        path: '/api/author/:name',
        name,
      })
    })
    const handler = handle(app)
    const req = new Request('http://localhost/api/author/hono')
    const res = await handler(req)
    // handler always returns a Response at runtime; narrow from Response|void
    if (!res) {
      throw new Error('Expected a Response but got void')
    }
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      path: '/api/author/:name',
      name: 'hono',
    })
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

  it('Should accept an optional second context argument (Next.js 15 compatibility)', async () => {
    const app = new Hono()
    app.get('/ping', (c) => c.text('pong'))

    const handler = handle(app)
    const req = new Request('http://localhost/ping')
    // Next.js 15 passes a route context object as the second argument;
    // the handler must accept it without error.
    const res = await handler(req, { params: {} })
    if (!res) {
      throw new Error('Expected a Response but got void')
    }
    expect(res.status).toBe(200)
  })
})
