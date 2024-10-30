import { Hono } from '../../hono'
import { proxyFetch } from '.'

describe('Proxy Middleware', () => {
  describe('proxyFetch', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('ok', {
          headers: {
            'Content-Encoding': 'gzip',
            'Content-Length': '100',
            'Content-Range': 'bytes 0-2/1024',
            'X-Response-Id': '456',
          },
        })
      )
    })

    it('simple proxy', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) =>
        proxyFetch(
          new Request(`https://example.com/${c.req.param('path')}`, {
            headers: {
              'X-Request-Id': '123',
              'Accept-Encoding': 'gzip',
            },
          })
        )
      )
      const res = await app.request('/proxy/test')
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]

      expect(req.url).toBe('https://example.com/test')
      expect(req.headers.get('X-Request-Id')).toBe('123')
      expect(req.headers.get('Accept-Encoding')).toBeNull()

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Response-Id')).toBe('456')
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Content-Length')).toBeNull()
      expect(res.headers.get('Content-Range')).toBe('bytes 0-2/1024')
    })

    it('proxySetRequestHeaders option', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) =>
        proxyFetch(
          new Request(`https://example.com/${c.req.param('path')}`, {
            headers: {
              'X-Request-Id': '123',
              'X-To-Be-Deleted': 'to-be-deleted',
              'Accept-Encoding': 'gzip',
            },
          }),
          {
            proxySetRequestHeaders: {
              'X-Request-Id': 'abc',
              'X-Forwarded-For': '127.0.0.1',
              'X-Forwarded-Host': 'example.com',
              'X-To-Be-Deleted': undefined,
            },
          }
        )
      )
      const res = await app.request('/proxy/test')
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]

      expect(req.url).toBe('https://example.com/test')
      expect(req.headers.get('X-Request-Id')).toBe('abc')
      expect(req.headers.get('X-Forwarded-For')).toBe('127.0.0.1')
      expect(req.headers.get('X-Forwarded-Host')).toBe('example.com')
      expect(req.headers.get('X-To-Be-Deleted')).toBeNull()
      expect(req.headers.get('Accept-Encoding')).toBeNull()

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Response-Id')).toBe('456')
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Content-Length')).toBeNull()
      expect(res.headers.get('Content-Range')).toBe('bytes 0-2/1024')
    })

    it('proxySetRequestHeaderNames option', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) =>
        proxyFetch(
          new Request(`https://example.com/${c.req.param('path')}`, {
            headers: {
              'X-Request-Id': '123',
              'Accept-Encoding': 'gzip',
            },
          }),
          {
            proxyDeleteResponseHeaderNames: ['X-Response-Id'],
          }
        )
      )
      const res = await app.request('/proxy/test')
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]

      expect(req.url).toBe('https://example.com/test')
      expect(req.headers.get('X-Request-Id')).toBe('123')
      expect(req.headers.get('Accept-Encoding')).toBeNull()

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Response-Id')).toBeNull()
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Content-Length')).toBeNull()
      expect(res.headers.get('Content-Range')).toBe('bytes 0-2/1024')
    })
  })
})
