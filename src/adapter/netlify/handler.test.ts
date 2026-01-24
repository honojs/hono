import { Hono } from '../../hono'
import { handle } from './handler'

describe('Netlify Adapter', () => {
  // Mock Netlify context
  const createMockContext = (overrides = {}) => ({
    geo: {
      city: 'San Francisco',
      country: { code: 'US', name: 'United States' },
    },
    ip: '192.168.1.1',
    requestId: 'test-request-id',
    ...overrides,
  })

  describe('Basic Request Handling', () => {
    it('Should return 200 response for GET request', async () => {
      const app = new Hono()
      app.get('/', (c) => c.text('Hello Netlify'))

      const handler = handle(app)
      const req = new Request('http://localhost/')
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Hello Netlify')
    })

    it('Should handle POST request with JSON body', async () => {
      const app = new Hono()
      app.post('/api/users', async (c) => {
        const body = await c.req.json()
        return c.json({ received: body })
      })

      const handler = handle(app)
      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John' }),
      })
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        received: { name: 'John' },
      })
    })

    it('Should handle path parameters', async () => {
      const app = new Hono()
      app.get('/users/:id', (c) => {
        const id = c.req.param('id')
        return c.json({ userId: id })
      })

      const handler = handle(app)
      const req = new Request('http://localhost/users/123')
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ userId: '123' })
    })

    it('Should handle query parameters', async () => {
      const app = new Hono()
      app.get('/search', (c) => {
        const query = c.req.query('q')
        return c.json({ query })
      })

      const handler = handle(app)
      const req = new Request('http://localhost/search?q=hono')
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ query: 'hono' })
    })
  })

  describe('Context Handling', () => {
    it('Should pass Netlify context to Hono env', async () => {
      const app = new Hono()
      app.get('/', (c) => {
        const netlifyCtx = c.env.context
        return c.json({
          ip: netlifyCtx.ip,
          requestId: netlifyCtx.requestId,
        })
      })

      const handler = handle(app)
      const req = new Request('http://localhost/')
      const ctx = createMockContext({ ip: '10.0.0.1', requestId: 'req-abc' })

      const res = await handler(req, ctx)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        ip: '10.0.0.1',
        requestId: 'req-abc',
      })
    })

    it('Should access geo information from context', async () => {
      const app = new Hono()
      app.get('/geo', (c) => {
        const { geo } = c.env.context
        return c.json({
          city: geo.city,
          country: geo.country?.code,
        })
      })

      const handler = handle(app)
      const req = new Request('http://localhost/geo')
      const ctx = createMockContext({
        geo: {
          city: 'Tokyo',
          country: { code: 'JP', name: 'Japan' },
        },
      })

      const res = await handler(req, ctx)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        city: 'Tokyo',
        country: 'JP',
      })
    })
  })

  describe('Response Handling', () => {
    it('Should return JSON response with correct content-type', async () => {
      const app = new Hono()
      app.get('/api', (c) => c.json({ message: 'Hello' }))

      const handler = handle(app)
      const req = new Request('http://localhost/api')
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/json')
    })

    it('Should return custom status codes', async () => {
      const app = new Hono()
      app.post('/created', (c) => c.json({ id: 1 }, 201))

      const handler = handle(app)
      const req = new Request('http://localhost/created', { method: 'POST' })
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(201)
    })

    it('Should return custom headers', async () => {
      const app = new Hono()
      app.get('/headers', (c) => {
        c.header('X-Custom-Header', 'custom-value')
        return c.text('OK')
      })

      const handler = handle(app)
      const req = new Request('http://localhost/headers')
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.headers.get('X-Custom-Header')).toBe('custom-value')
    })
  })

  describe('Error Handling', () => {
    it('Should return 404 for unmatched routes', async () => {
      const app = new Hono()
      app.get('/exists', (c) => c.text('Found'))

      const handler = handle(app)
      const req = new Request('http://localhost/not-exists')
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(404)
    })

    it('Should handle custom error handler', async () => {
      const app = new Hono()
      app.get('/error', () => {
        throw new Error('Something went wrong')
      })
      app.onError((err, c) => {
        return c.json({ error: err.message }, 500)
      })

      const handler = handle(app)
      const req = new Request('http://localhost/error')
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'Something went wrong' })
    })
  })

  describe('Middleware', () => {
    it('Should execute middleware', async () => {
      const app = new Hono()

      app.use('*', async (c, next) => {
        c.header('X-Middleware', 'executed')
        await next()
      })

      app.get('/', (c) => c.text('Hello'))

      const handler = handle(app)
      const req = new Request('http://localhost/')
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Middleware')).toBe('executed')
    })
  })

  describe('Compatibility', () => {
    it('Should work with basePath', async () => {
      const app = new Hono().basePath('/api')
      app.get('/users', (c) => c.json({ users: [] }))

      const handler = handle(app)
      const req = new Request('http://localhost/api/users')
      const ctx = createMockContext()

      const res = await handler(req, ctx)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ users: [] })
    })

    it('Should propagate errors when onError re-throws', async () => {
      const app = new Hono().basePath('/api')

      app.onError((e) => {
        throw e
      })
      app.get('/error', () => {
        throw new Error('Custom Error')
      })

      const handler = handle(app)
      const req = new Request('http://localhost/api/error')
      const ctx = createMockContext()

      let error: Error | null = null
      try {
        await handler(req, ctx)
      } catch (e) {
        error = e as Error
      }
      expect(error).not.toBeNull()
      expect(error?.message).toBe('Custom Error')
    })
  })
})
