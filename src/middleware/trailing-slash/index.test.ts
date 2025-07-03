import { Hono } from '../../hono'
import { appendTrailingSlash, trimTrailingSlash } from '.'

describe('Resolve trailing slash', () => {
  describe('trimTrailingSlash middleware', () => {
    const app = new Hono({ strict: true })
    app.use('*', trimTrailingSlash())

    app.get('/', async (c) => {
      return c.text('ok')
    })
    app.get('/the/example/endpoint/without/trailing/slash', async (c) => {
      return c.text('ok')
    })

    it('should handle GET request for root path correctly', async () => {
      const resp = await app.request('/')

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should handle GET request for path without trailing slash correctly', async () => {
      const resp = await app.request('/the/example/endpoint/without/trailing/slash')

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should handle GET request for path with trailing slash correctly', async () => {
      const resp = await app.request('/the/example/endpoint/without/trailing/slash/')
      const loc = new URL(resp.headers.get('location')!)

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(301)
      expect(loc.pathname).toBe('/the/example/endpoint/without/trailing/slash')
    })

    it('should preserve query parameters when redirecting', async () => {
      const resp = await app.request('/the/example/endpoint/without/trailing/slash/?exampleParam=1')
      const loc = new URL(resp.headers.get('location')!)

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(301)
      expect(loc.pathname).toBe('/the/example/endpoint/without/trailing/slash')
      expect(loc.searchParams.get('exampleParam')).toBe('1')
    })

    it('should handle HEAD request for root path correctly', async () => {
      const resp = await app.request('/', { method: 'HEAD' })

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should handle HEAD request for path without trailing slash correctly', async () => {
      const resp = await app.request('/the/example/endpoint/without/trailing/slash', {
        method: 'HEAD',
      })

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should handle HEAD request for path with trailing slash correctly', async () => {
      const resp = await app.request('/the/example/endpoint/without/trailing/slash/', {
        method: 'HEAD',
      })
      const loc = new URL(resp.headers.get('location')!)

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(301)
      expect(loc.pathname).toBe('/the/example/endpoint/without/trailing/slash')
    })

    it('should preserve query parameters when redirecting HEAD requests', async () => {
      const resp = await app.request(
        '/the/example/endpoint/without/trailing/slash/?exampleParam=1',
        { method: 'HEAD' }
      )
      const loc = new URL(resp.headers.get('location')!)

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(301)
      expect(loc.pathname).toBe('/the/example/endpoint/without/trailing/slash')
      expect(loc.searchParams.get('exampleParam')).toBe('1')
    })
  })

  describe('appendTrailingSlash middleware', () => {
    const app = new Hono({ strict: true })
    app.use('*', appendTrailingSlash())

    app.get('/', async (c) => {
      return c.text('ok')
    })
    app.get('/the/example/endpoint/with/trailing/slash/', async (c) => {
      return c.text('ok')
    })
    app.get('/the/example/simulate/a.file', async (c) => {
      return c.text('ok')
    })

    it('should handle GET request for root path correctly', async () => {
      const resp = await app.request('/')

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should handle GET request for file-like paths correctly', async () => {
      const resp = await app.request('/the/example/simulate/a.file')

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should handle GET request for path with trailing slash correctly', async () => {
      const resp = await app.request('/the/example/endpoint/with/trailing/slash/')

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should redirect path without trailing slash to one with it', async () => {
      const resp = await app.request('/the/example/endpoint/with/trailing/slash')
      const loc = new URL(resp.headers.get('location')!)

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(301)
      expect(loc.pathname).toBe('/the/example/endpoint/with/trailing/slash/')
    })

    it('should preserve query parameters when redirecting', async () => {
      const resp = await app.request('/the/example/endpoint/with/trailing/slash?exampleParam=1')
      const loc = new URL(resp.headers.get('location')!)

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(301)
      expect(loc.pathname).toBe('/the/example/endpoint/with/trailing/slash/')
      expect(loc.searchParams.get('exampleParam')).toBe('1')
    })

    it('should handle HEAD request for root path correctly', async () => {
      const resp = await app.request('/', { method: 'HEAD' })

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should handle HEAD request for file-like paths correctly', async () => {
      const resp = await app.request('/the/example/simulate/a.file', { method: 'HEAD' })

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should handle HEAD request for path with trailing slash correctly', async () => {
      const resp = await app.request('/the/example/endpoint/with/trailing/slash/', {
        method: 'HEAD',
      })

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(200)
    })

    it('should redirect HEAD request for path without trailing slash to one with it', async () => {
      const resp = await app.request('/the/example/endpoint/with/trailing/slash', {
        method: 'HEAD',
      })
      const loc = new URL(resp.headers.get('location')!)

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(301)
      expect(loc.pathname).toBe('/the/example/endpoint/with/trailing/slash/')
    })

    it('should preserve query parameters when redirecting HEAD requests', async () => {
      const resp = await app.request('/the/example/endpoint/with/trailing/slash?exampleParam=1', {
        method: 'HEAD',
      })
      const loc = new URL(resp.headers.get('location')!)

      expect(resp).not.toBeNull()
      expect(resp.status).toBe(301)
      expect(loc.pathname).toBe('/the/example/endpoint/with/trailing/slash/')
      expect(loc.searchParams.get('exampleParam')).toBe('1')
    })
  })
})
