import { Hono } from '../../hono'
import { proxyFetch } from '.'

describe('Proxy Middleware', () => {
  describe('proxyFetch', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockImplementation(async (req) => {
        if (req.url === 'https://example.com/compressed') {
          return Promise.resolve(
            new Response('ok', {
              headers: {
                'Content-Encoding': 'gzip',
                'Content-Length': '1',
                'Content-Range': 'bytes 0-2/1024',
                'X-Response-Id': '456',
              },
            })
          )
        } else if (req.url === 'https://example.com/uncompressed') {
          return Promise.resolve(
            new Response('ok', {
              headers: {
                'Content-Length': '2',
                'Content-Range': 'bytes 0-2/1024',
                'X-Response-Id': '456',
              },
            })
          )
        } else if (req.url === 'https://example.com/post' && req.method === 'POST') {
          return Promise.resolve(new Response(`request body: ${await req.text()}`))
        }
        return Promise.resolve(new Response('not found', { status: 404 }))
      })
    })

    it('compressed', async () => {
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
      const res = await app.request('/proxy/compressed')
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]

      expect(req.url).toBe('https://example.com/compressed')
      expect(req.headers.get('X-Request-Id')).toBe('123')
      expect(req.headers.get('Accept-Encoding')).toBeNull()

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Response-Id')).toBe('456')
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Content-Length')).toBeNull()
      expect(res.headers.get('Content-Range')).toBe('bytes 0-2/1024')
    })

    it('uncompressed', async () => {
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
      const res = await app.request('/proxy/uncompressed')
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]

      expect(req.url).toBe('https://example.com/uncompressed')
      expect(req.headers.get('X-Request-Id')).toBe('123')
      expect(req.headers.get('Accept-Encoding')).toBeNull()

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Response-Id')).toBe('456')
      expect(res.headers.get('Content-Length')).toBe('2')
      expect(res.headers.get('Content-Range')).toBe('bytes 0-2/1024')
    })

    it('POST request', async () => {
      const app = new Hono()
      app.all('/proxy/:path', (c) => {
        return proxyFetch(`https://example.com/${c.req.param('path')}`, {
          ...c.req,
          headers: {
            ...c.req.header(),
            'X-Request-Id': '123',
            'Accept-Encoding': 'gzip',
          },
        })
      })
      const res = await app.request('/proxy/post', {
        method: 'POST',
        body: 'test',
      })
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]

      expect(req.url).toBe('https://example.com/post')

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('request body: test')
    })
  })
})
