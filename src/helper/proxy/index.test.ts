import { Hono } from '../../hono'
import { proxy } from '.'

describe('Proxy Middleware', () => {
  describe('proxy', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockImplementation(async (req) => {
        if (req.url === 'https://example.com/ok') {
          return Promise.resolve(new Response('ok'))
        } else if (req.url === 'https://example.com/disconnect') {
          const reader = req.body.getReader()
          let response

          req.signal.addEventListener('abort', () => {
            response = req.signal.reason
            reader.cancel()
          })

          await reader.read()

          return Promise.resolve(new Response(response))
        } else if (req.url === 'https://example.com/compressed') {
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
          headers: {
            ...c.req.header(),
            Authorization: undefined,
          },
        })
      )
      await app.request('/proxy/ok', {
        headers: {
          Authorization: 'Bearer 123',
        },
      })
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(req.headers.get('Authorization')).toBeNull()
    })

    it('client disconnect', async () => {
      const app = new Hono()
      const controller = new AbortController()
      app.post('/proxy/:path', (c) => proxy(`https://example.com/${c.req.param('path')}`, c.req))
      const resPromise = app.request('/proxy/disconnect', {
        method: 'POST',
        body: 'test',
        signal: controller.signal,
      })
      controller.abort('client disconnect')
      const res = await resPromise
      expect(await res.text()).toBe('client disconnect')
    })

    it('not found', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) => proxy(`https://example.com/${c.req.param('path')}`))
      const res = await app.request('/proxy/404')
      expect(res.status).toBe(404)
    })

    it('pass a Request object to proxyInit', async () => {
      const app = new Hono()
      app.get('/proxy/:path', (c) => {
        const req = new Request(c.req.raw, {
          headers: {
            'X-Request-Id': '123',
            'Accept-Encoding': 'gzip',
          },
        })
        return proxy(`https://example.com/${c.req.param('path')}`, req)
      })
      const res = await app.request('/proxy/compressed')
      const req = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]

      expect(req.url).toBe('https://example.com/compressed')
      expect(req.headers.get('X-Request-Id')).toBe('123')
      expect(req.headers.get('Accept-Encoding')).toBeNull()

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('ok')
    })

    it('Should call the custom fetch method when specified', async () => {
      const customFetch = vi.fn().mockImplementation(async (req: Request) => {
        const text = await req.text()
        return new Response('custom fetch response. message:' + text)
      })
      const app = new Hono()
      app.post('/', (c) => {
        return proxy(`https://example.com/`, {
          customFetch,
          ...c.req,
        })
      })
      const res = await app.request('/', {
        method: 'POST',
        body: 'hi',
      })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('custom fetch response. message:hi')
    })
  })
})
