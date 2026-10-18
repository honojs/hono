import { Hono } from '../../hono'
import { methodOverride } from './index'

describe('Method Override Middleware', () => {
  describe('Form', () => {
    const app = new Hono()
    app.use('/posts/*', methodOverride({ app }))
    app.use('/posts-custom/*', methodOverride({ app, form: 'custom-input-name' }))
    app.on(['post', 'delete'], ['/posts', '/posts-custom'], async (c) => {
      const form = await c.req.formData()
      return c.json({
        method: c.req.method,
        message: form.get('message'),
        contentType: c.req.header('content-type') ?? '',
      })
    })

    describe('multipart/form-data', () => {
      it('Should override POST to DELETE', async () => {
        const form = new FormData()
        form.append('message', 'Hello')
        form.append('_method', 'DELETE')
        const res = await app.request('/posts', {
          body: form,
          method: 'POST',
        })
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.method).toBe('DELETE')
        expect(data.message).toBe('Hello')
        expect(data.contentType).toMatch(/^multipart\/form-data;/)
      })

      it('Should override POST to DELETE - with a custom form input name', async () => {
        const form = new FormData()
        form.append('message', 'Hello')
        form.append('custom-input-name', 'DELETE')
        const res = await app.request('/posts-custom', {
          body: form,
          method: 'POST',
        })
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.method).toBe('DELETE')
        expect(data.message).toBe('Hello')
        expect(data.contentType).toMatch(/^multipart\/form-data;/)
      })

      it('Should override POST to PATCH - not found', async () => {
        const form = new FormData()
        form.append('message', 'Hello')
        form.append('_method', 'PATCH')
        const res = await app.request('/posts', {
          body: form,
          method: 'POST',
        })
        expect(res.status).toBe(404)
      })
    })

    describe('application/x-www-form-urlencoded', () => {
      it.each(['_method', 'custom-input-name'])(
        'Should remove stale Content-Length when rewriting %s',
        async (form) => {
          const app = new Hono()
          app.use('/posts', methodOverride({ app, form }))
          app.delete('/posts', async (c) =>
            c.json({
              method: c.req.method,
              body: await c.req.text(),
              contentLength: c.req.header('content-length') ?? null,
              contentType: c.req.header('content-type'),
              customHeader: c.req.header('x-custom'),
            })
          )
          const body = new URLSearchParams({ [form]: 'DELETE', message: 'Hello' }).toString()
          const res = await app.request('/posts', {
            method: 'POST',
            body,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
              'Content-Length': String(new TextEncoder().encode(body).length),
              'X-Custom': 'preserved',
            },
          })

          expect(res.status).toBe(200)
          expect(await res.json()).toEqual({
            method: 'DELETE',
            body: 'message=Hello',
            contentLength: null,
            contentType: 'application/x-www-form-urlencoded;charset=UTF-8',
            customHeader: 'preserved',
          })
        }
      )

      it('Should preserve Content-Length when no method override is supplied', async () => {
        const app = new Hono()
        app.use('/posts', methodOverride({ app }))
        app.post('/posts', async (c) =>
          c.json({
            body: await c.req.text(),
            contentLength: c.req.header('content-length'),
          })
        )
        const res = await app.request('/posts', {
          method: 'POST',
          body: 'message=Hello',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': '13',
          },
        })

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ body: 'message=Hello', contentLength: '13' })
      })

      it('Should override POST to DELETE', async () => {
        const params = new URLSearchParams()
        params.append('message', 'Hello')
        params.append('_method', 'DELETE')
        const res = await app.request('/posts', {
          body: params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          method: 'POST',
        })
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.method).toBe('DELETE')
        expect(data.message).toBe('Hello')
        expect(data.contentType).toBe('application/x-www-form-urlencoded')
      })

      it('Should override POST to DELETE - with a custom form input name', async () => {
        const params = new URLSearchParams()
        params.append('message', 'Hello')
        params.append('custom-input-name', 'DELETE')
        const res = await app.request('/posts-custom', {
          body: params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          method: 'POST',
        })
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.method).toBe('DELETE')
        expect(data.message).toBe('Hello')
        expect(data.contentType).toBe('application/x-www-form-urlencoded')
      })

      it('Should override POST to DELETE - with charset in Content-Type', async () => {
        const params = new URLSearchParams()
        params.append('message', 'Hello')
        params.append('_method', 'DELETE')
        const res = await app.request('/posts', {
          body: params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          method: 'POST',
        })
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.method).toBe('DELETE')
        expect(data.message).toBe('Hello')
      })

      it('Should override POST to PATCH - not found', async () => {
        const form = new FormData()
        form.append('message', 'Hello')
        form.append('_method', 'PATCH')
        const res = await app.request('/posts', {
          body: form,
          method: 'POST',
        })
        expect(res.status).toBe(404)
      })
    })
  })

  describe('Header', () => {
    const app = new Hono()
    app.use('/posts/*', methodOverride({ app, header: 'X-METHOD-OVERRIDE' }))
    app.on(['get', 'post', 'delete'], '/posts', async (c) => {
      return c.json({
        method: c.req.method,
        headerValue: c.req.header('X-METHOD-OVERRIDE') ?? null,
      })
    })

    it('Should override POST to DELETE', async () => {
      const res = await app.request('/posts', {
        method: 'POST',
        headers: {
          'X-METHOD-OVERRIDE': 'DELETE',
        },
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        method: 'DELETE',
        headerValue: null,
      })
    })

    it('Should not override GET request', async () => {
      const res = await app.request('/posts', {
        method: 'GET',
        headers: {
          'X-METHOD-OVERRIDE': 'DELETE',
        },
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        method: 'GET',
        headerValue: 'DELETE', // It does not modify the headers.
      })
    })
  })

  describe('Query', () => {
    const app = new Hono()
    app.use('/posts/*', methodOverride({ app, query: '_method' }))
    app.on(['get', 'post', 'delete'], '/posts', async (c) => {
      return c.json({
        method: c.req.method,
        queryValue: c.req.query('_method') ?? null,
      })
    })

    it('Should override POST to DELETE', async () => {
      const res = await app.request('/posts?_method=delete', {
        method: 'POST',
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        method: 'DELETE',
        queryValue: null,
      })
    })

    it('Should override POST to DELETE when the request has a body', async () => {
      const app = new Hono()
      app.use('/posts/*', methodOverride({ app, query: '_method' }))
      app.on(['post', 'delete'], '/posts', async (c) => {
        return c.json({
          method: c.req.method,
          body: await c.req.text(),
          queryValue: c.req.query('_method') ?? null,
        })
      })
      const res = await app.request('/posts?_method=delete', {
        method: 'POST',
        body: new URLSearchParams({ message: 'Hello' }),
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        method: 'DELETE',
        body: 'message=Hello',
        queryValue: null,
      })
    })

    it('Should not override GET request', async () => {
      const res = await app.request('/posts?_method=delete', {
        method: 'GET',
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        method: 'GET',
        queryValue: 'delete', // It does not modify the queries.
      })
    })
  })
})
