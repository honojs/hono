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
