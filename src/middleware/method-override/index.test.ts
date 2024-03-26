import { Hono } from '../../hono'
import { methodOverride } from './index'

describe('Method Override Middleware', () => {
  describe('Form', () => {
    const app = new Hono()
    app.use('/posts/*', methodOverride({ app }))
    app.use('/posts-custom/*', methodOverride({ app, form: 'custom-input-name' }))
    for (const path of ['/posts', '/posts-custom']) {
      app.on(['post', 'delete'], path, async (c) => {
        const form = await c.req.formData()
        return c.json({
          method: c.req.method,
          message: form.get('message'),
          contentType: c.req.header('content-type') ?? '',
        })
      })
    }

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

    describe.only('application/x-www-form-urlencoded', () => {
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
  // WIP
  describe('Header', () => {})
  // WIP
  describe('Query', () => {})
})
