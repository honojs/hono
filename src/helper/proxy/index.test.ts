import { Hono } from '../../hono'
import { proxy } from '.'

describe('Proxy Middleware', () => {
  describe('proxy', () => {
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
        } else if (req.url === 'https://example.com/hop-by-hop') {
          return Promise.resolve(
            new Response('ok', {
              headers: {
                'Transfer-Encoding': 'chunked',
              },
            })
          )
        } else if (req.url === 'https://example.com/set-cookie') {
          return Promise.resolve(
            new Response('ok', {
              headers: {
                'Set-Cookie': 'test=123',
              },
            })
          )
        } else if (req.url === 'https://example.com/no-propagate') {
          return Promise.resolve(
            new Response(`request authorization header: ${req.headers.get('authorization')}`)
          )
        }
        return Promise.resolve(new Response('not found', { status: 404 }))
      })
    })

    it('compressed', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) =>
        proxy(
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
        proxy(
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
        return proxy(`https://example.com/${c.req.param('path')}`, {
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

    it('remove hop-by-hop headers', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) => proxy(`https://example.com/${c.req.param('path')}`))

      const res = await app.request('/proxy/hop-by-hop', {
        headers: {
          Connection: 'keep-alive',
          'Keep-Alive': 'timeout=5, max=1000',
          'Proxy-Authorization': 'Basic 123456',
        },
      })
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]

      expect(req.headers.get('Connection')).toBeNull()
      expect(req.headers.get('Keep-Alive')).toBeNull()
      expect(req.headers.get('Proxy-Authorization')).toBeNull()

      expect(res.headers.get('Transfer-Encoding')).toBeNull()
    })

    it('specify hop-by-hop header by options', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) =>
        proxy(`https://example.com/${c.req.param('path')}`, {
          headers: {
            'Proxy-Authorization': 'Basic 123456',
          },
        })
      )

      const res = await app.request('/proxy/hop-by-hop')
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]

      expect(req.headers.get('Proxy-Authorization')).toBe('Basic 123456')

      expect(res.headers.get('Transfer-Encoding')).toBeNull()
    })

    it('modify header', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) =>
        proxy(`https://example.com/${c.req.param('path')}`, {
          headers: {
            'Set-Cookie': 'test=123',
          },
        }).then((res) => {
          res.headers.delete('Set-Cookie')
          res.headers.set('X-Response-Id', '456')
          return res
        })
      )
      const res = await app.request('/proxy/set-cookie')
      expect(res.headers.get('Set-Cookie')).toBeNull()
      expect(res.headers.get('X-Response-Id')).toBe('456')
    })

    it('does not propagate undefined request headers', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) =>
        proxy(`https://example.com/${c.req.param('path')}`, {
          ...c.req,
          headers: {
            Authorization: undefined,
            'X-Request-Id': '123',
          },
        })
      )
      const res = await app.request('/proxy/no-propagate', {
        headers: {
          Authorization: 'Bearer 123',
          'X-Request-Id': '123',
        },
      })
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(req.headers.get('Authorization')).toBeNull()
      expect(req.headers.get('X-Request-Id')).toBe('123, 123')

      expect(res.status).toBe(200)
      expect(res.headers.get('Authorization')).toBeNull()
      await expect(res.text()).resolves.toBe('request authorization header: null')
    })
  })
})
