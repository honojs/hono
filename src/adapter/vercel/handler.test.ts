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

  it('Should read `c.env`', async () => {
    process.env.MESSAGE = 'Hono is hot!'

    const app = new Hono<{
      Bindings: {
        MESSAGE: string
      }
    }>()
    app.get('/api/authors', async (c) => {
      return c.json([
        {
          name: 'yusukebe',
          message: c.env.MESSAGE,
        },
      ])
    })
    const handler = handle(app)
    const req = new Request('http://localhost/api/authors')
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([
      {
        name: 'yusukebe',
        message: process.env.MESSAGE,
      },
    ])
    delete process.env.MESSAGE
  })
})
