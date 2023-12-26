import type { Context } from '../../context'
import { Hono } from '../../hono'
import { csrf } from '../../middleware/csrf'

const simplePostHandler = vi.fn(async (c: Context) => {
  if (c.req.header('content-type') === 'application/json') {
    return c.text((await c.req.json<{ name: string }>())['name'])
  } else {
    const body = await c.req.parseBody<{ name: string }>()
    return c.text(body['name'])
  }
})

const buildSimplePostRequestData = (origin?: string) => ({
  method: 'POST',
  headers: Object.assign(
    {
      'content-type': 'application/x-www-form-urlencoded',
    },
    origin ? { origin } : {}
  ) as Record<string, string>,
  body: 'name=hono',
})

describe('CSRF by Middleware', () => {
  beforeEach(() => {
    simplePostHandler.mockClear()
  })

  describe('simple usage', () => {
    const app = new Hono()

    app.use('*', csrf())
    app.get('/form', (c) => c.html('<form></form>'))
    app.post('/form', simplePostHandler)
    app.put('/form', (c) => c.text('OK'))
    app.delete('/form', (c) => c.text('OK'))
    app.patch('/form', (c) => c.text('OK'))

    describe('GET /form', async () => {
      it('should be 200 for any request', async () => {
        const res = await app.request('http://localhost/form')

        expect(res.status).toBe(200)
        expect(await res.text()).toBe('<form></form>')
      })
    })

    describe('HEAD /form', async () => {
      it('should be 200 for any request', async () => {
        const res = await app.request('http://localhost/form', { method: 'HEAD' })

        expect(res.status).toBe(200)
      })
    })

    describe('POST /form', async () => {
      it('should be 200 for local request', async () => {
        /*
         * <form action="/form" method="POST"><input name="name" value="hono" /></form>
         * or
         * <script>
         * fetch('/form', {
         *   method: 'POST',
         *   headers: {
         *     'content-type': 'application/x-www-form-urlencoded',
         *   },
         *   body: 'name=hono',
         * });
         * </script>
         */
        const res = await app.request(
          'http://localhost/form',
          buildSimplePostRequestData('http://localhost')
        )

        expect(res.status).toBe(200)
        expect(await res.text()).toBe('hono')
      })

      it('should be 403 for "application/x-www-form-urlencoded" cross origin', async () => {
        /*
         * via http://example.com
         *
         * <form action="http://localhost/form" method="POST">
         *   <input name="name" value="hono" />
         * </form>
         * or
         * <script>
         * fetch('http://localhost/form', {
         *   method: 'POST',
         *   headers: {
         *     'content-type': 'application/x-www-form-urlencoded',
         *   },
         *   body: 'name=hono',
         * });
         * </script>
         */
        const res = await app.request(
          'http://localhost/form',
          buildSimplePostRequestData('http://example.com')
        )

        expect(res.status).toBe(403)
        expect(simplePostHandler).not.toHaveBeenCalled()
      })
    })

    it('should be 403 for "multipart/form-data" cross origin', async () => {
      /*
       * via http://example.com
       *
       * <form action="http://localhost/form" method="POST" enctype="multipart/form-data">
       *   <input name="name" value="hono" />
       * </form>
       * or
       * <script>
       * fetch('http://localhost/form', {
       *   method: 'POST',
       *   headers: {
       *     'content-type': 'multipart/form-data',
       *   },
       *   body: 'name=hono',
       * });
       * </script>
       */
      const res = await app.request(
        'http://localhost/form',
        buildSimplePostRequestData('http://example.com')
      )

      expect(res.status).toBe(403)
      expect(simplePostHandler).not.toHaveBeenCalled()
    })

    it('should be 403 for "text/plain" cross origin', async () => {
      /*
       * via http://example.com
       *
       * <form action="http://localhost/form" method="POST" enctype="text/plain">
       *   <input name="name" value="hono" />
       * </form>
       * or
       * <script>
       * fetch('http://localhost/form', {
       *   method: 'POST',
       *   headers: {
       *     'content-type': 'text/plain',
       *   },
       *   body: 'name=hono',
       * });
       * </script>
       */
      const res = await app.request(
        'http://localhost/form',
        buildSimplePostRequestData('http://example.com')
      )

      expect(res.status).toBe(403)
      expect(simplePostHandler).not.toHaveBeenCalled()
    })

    it('should be 403 if request has no origin header', async () => {
      const res = await app.request('http://localhost/form', buildSimplePostRequestData())

      expect(res.status).toBe(403)
      expect(simplePostHandler).not.toHaveBeenCalled()
    })

    it('should be 200 for application/json', async () => {
      /*
       * via http://example.com
       * Assume localhost allows cross origin POST
       *
       * <script>
       * fetch('http://localhost/form', {
       *   method: 'POST',
       *   headers: {
       *     'content-type': 'application/json',
       *   },
       *   body: JSON.stringify({ name: 'hono' }),
       * });
       * </script>
       */
      const res = await app.request('http://localhost/form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://example.com',
        },
        body: JSON.stringify({ name: 'hono' }),
      })

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('hono')
    })
  })

  describe('with origin option', () => {
    describe('string', () => {
      const app = new Hono()

      app.use(
        '*',
        csrf({
          origin: 'https://example.com',
        })
      )
      app.post('/form', simplePostHandler)

      it('should be 200 for allowed origin', async () => {
        const res = await app.request(
          'https://example.com/form',
          buildSimplePostRequestData('https://example.com')
        )
        expect(res.status).toBe(200)
      })

      it('should be 403 for not allowed origin', async () => {
        const res = await app.request(
          'https://example.jp/form',
          buildSimplePostRequestData('https://example.jp')
        )
        expect(res.status).toBe(403)
        expect(simplePostHandler).not.toHaveBeenCalled()
      })
    })

    describe('string[]', () => {
      const app = new Hono()

      app.use(
        '*',
        csrf({
          origin: ['https://example.com', 'https://hono.example.com'],
        })
      )
      app.post('/form', simplePostHandler)

      it('should be 200 for allowed origin', async () => {
        let res = await app.request(
          'https://hono.example.com/form',
          buildSimplePostRequestData('https://hono.example.com')
        )
        expect(res.status).toBe(200)

        res = await app.request(
          'https://example.com/form',
          buildSimplePostRequestData('https://example.com')
        )
        expect(res.status).toBe(200)
      })

      it('should be 403 for not allowed origin', async () => {
        const res = await app.request(
          'http://example.jp/form',
          buildSimplePostRequestData('http://example.jp')
        )
        expect(res.status).toBe(403)
        expect(simplePostHandler).not.toHaveBeenCalled()
      })
    })

    describe('IsAllowedOriginHandler', () => {
      const app = new Hono()

      app.use(
        '*',
        csrf({
          origin: (origin) => /https:\/\/(\w+\.)?example\.com$/.test(origin),
        })
      )
      app.post('/form', simplePostHandler)

      it('should be 200 for allowed origin', async () => {
        let res = await app.request(
          'https://hono.example.com/form',
          buildSimplePostRequestData('https://hono.example.com')
        )
        expect(res.status).toBe(200)

        res = await app.request(
          'https://example.com/form',
          buildSimplePostRequestData('https://example.com')
        )
        expect(res.status).toBe(200)
      })

      it('should be 403 for not allowed origin', async () => {
        let res = await app.request(
          'http://honojs.hono.example.jp/form',
          buildSimplePostRequestData('http://example.jp')
        )
        expect(res.status).toBe(403)
        expect(simplePostHandler).not.toHaveBeenCalled()

        res = await app.request(
          'http://example.jp/form',
          buildSimplePostRequestData('http://example.jp')
        )
        expect(res.status).toBe(403)
        expect(simplePostHandler).not.toHaveBeenCalled()
      })
    })
  })
})
