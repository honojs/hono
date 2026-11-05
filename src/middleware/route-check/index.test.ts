import { Hono } from '../../hono'
import { bearerAuth } from '../bearer-auth'
import { routeCheck } from '.'

describe('Route Check Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  describe('Basic functionality', () => {
    it('Should allow access to existing routes', async () => {
      app.use('/admin/*', routeCheck())
      app.get('/admin/dashboard', (c) => c.text('Admin Dashboard'))

      const res = await app.request('/admin/dashboard')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Admin Dashboard')
    })

    it('Should return 404 for non-existent routes', async () => {
      app.use('/admin/*', routeCheck())
      app.get('/admin/dashboard', (c) => c.text('Admin Dashboard'))

      const res = await app.request('/admin/non-existent')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('404 Not Found')
    })

    it('Should work with POST routes', async () => {
      app.use('/api/*', routeCheck())
      app.post('/api/users', (c) => c.text('User Created'))

      const res = await app.request('/api/users', { method: 'POST' })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('User Created')
    })

    it('Should return 404 for non-existent POST routes', async () => {
      app.use('/api/*', routeCheck())
      app.post('/api/users', (c) => c.text('User Created'))

      const res = await app.request('/api/posts', { method: 'POST' })
      expect(res.status).toBe(404)
    })
  })

  describe('Integration with authentication middleware', () => {
    it('Should skip authentication for non-existent routes', async () => {
      let authExecuted = false

      app.use('/admin/*', routeCheck())
      app.use('/admin/*', async (c, next) => {
        authExecuted = true
        await next()
      })
      app.get('/admin/dashboard', (c) => c.text('Admin Dashboard'))

      const res = await app.request('/admin/non-existent')
      expect(res.status).toBe(404)
      expect(authExecuted).toBe(false)
    })

    it('Should execute authentication for existing routes', async () => {
      let authExecuted = false

      app.use('/admin/*', routeCheck())
      app.use('/admin/*', async (c, next) => {
        authExecuted = true
        await next()
      })
      app.get('/admin/dashboard', (c) => c.text('Admin Dashboard'))

      const res = await app.request('/admin/dashboard')
      expect(res.status).toBe(200)
      expect(authExecuted).toBe(true)
    })

    it('Should work with bearerAuth middleware', async () => {
      app.use('/admin/*', routeCheck())
      app.use('/admin/*', bearerAuth({ token: 'my-secret' }))
      app.get('/admin/dashboard', (c) => c.text('Admin Dashboard'))

      // Non-existent route should return 404 without auth
      const res1 = await app.request('/admin/non-existent')
      expect(res1.status).toBe(404)

      // Existing route without auth should return 401
      const res2 = await app.request('/admin/dashboard')
      expect(res2.status).toBe(401)

      // Existing route with auth should return 200
      const res3 = await app.request('/admin/dashboard', {
        headers: { Authorization: 'Bearer my-secret' },
      })
      expect(res3.status).toBe(200)
      expect(await res3.text()).toBe('Admin Dashboard')
    })
  })

  describe('Support for different route definitions', () => {
    it('Should work with app.all()', async () => {
      app.use('/admin/*', routeCheck())
      app.all('/admin/settings', (c) => c.text('Settings'))

      const res1 = await app.request('/admin/settings', { method: 'GET' })
      expect(res1.status).toBe(200)
      expect(await res1.text()).toBe('Settings')

      const res2 = await app.request('/admin/settings', { method: 'POST' })
      expect(res2.status).toBe(200)
      expect(await res2.text()).toBe('Settings')
    })

    it('Should distinguish between handlers and middleware', async () => {
      app.use('/api/*', routeCheck())
      app.use('/api/*', async (c, next) => {
        // This is middleware, not a handler
        await next()
      })
      app.get('/api/users', (c) => c.text('Users'))

      // Should return 200 because handler exists
      const res1 = await app.request('/api/users')
      expect(res1.status).toBe(200)

      // Should return 404 because no handler exists
      const res2 = await app.request('/api/posts')
      expect(res2.status).toBe(404)
    })

    it('Should work with multiple HTTP methods on same path', async () => {
      app.use('/api/*', routeCheck())
      app.get('/api/users', (c) => c.text('Get Users'))
      app.post('/api/users', (c) => c.text('Create User'))

      const res1 = await app.request('/api/users', { method: 'GET' })
      expect(res1.status).toBe(200)
      expect(await res1.text()).toBe('Get Users')

      const res2 = await app.request('/api/users', { method: 'POST' })
      expect(res2.status).toBe(200)
      expect(await res2.text()).toBe('Create User')

      // PUT should return 404 as no handler exists
      const res3 = await app.request('/api/users', { method: 'PUT' })
      expect(res3.status).toBe(404)
    })
  })

  describe('Custom onNotFound handler', () => {
    it('Should use custom handler when route not found', async () => {
      app.use(
        '/api/*',
        routeCheck({
          onNotFound: (c) => c.json({ error: 'API endpoint not found' }, 404),
        })
      )
      app.get('/api/users', (c) => c.text('Users'))

      const res = await app.request('/api/posts')
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: 'API endpoint not found' })
    })

    it('Should use default handler when onNotFound not specified', async () => {
      app.use('/api/*', routeCheck())
      app.get('/api/users', (c) => c.text('Users'))

      const res = await app.request('/api/posts')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('404 Not Found')
    })

    it('Should not call onNotFound when route exists', async () => {
      let onNotFoundCalled = false

      app.use(
        '/api/*',
        routeCheck({
          onNotFound: (c) => {
            onNotFoundCalled = true
            return c.json({ error: 'Not found' }, 404)
          },
        })
      )
      app.get('/api/users', (c) => c.text('Users'))

      const res = await app.request('/api/users')
      expect(res.status).toBe(200)
      expect(onNotFoundCalled).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('Should work without any routes defined', async () => {
      app.use('/admin/*', routeCheck())

      const res = await app.request('/admin/anything')
      expect(res.status).toBe(404)
    })

    it('Should work with nested paths', async () => {
      app.use('/api/v1/*', routeCheck())
      app.get('/api/v1/users/:id', (c) => c.text(`User ${c.req.param('id')}`))

      const res1 = await app.request('/api/v1/users/123')
      expect(res1.status).toBe(200)
      expect(await res1.text()).toBe('User 123')

      const res2 = await app.request('/api/v1/posts/123')
      expect(res2.status).toBe(404)
    })

    it('Should work when placed after some middleware', async () => {
      let middleware1Executed = false

      app.use('/admin/*', async (c, next) => {
        middleware1Executed = true
        await next()
      })
      app.use('/admin/*', routeCheck())
      app.get('/admin/dashboard', (c) => c.text('Admin Dashboard'))

      const res = await app.request('/admin/non-existent')
      expect(res.status).toBe(404)
      expect(middleware1Executed).toBe(true)
    })
  })
})
