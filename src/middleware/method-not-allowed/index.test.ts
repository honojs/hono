import { Hono } from '../../hono'
import { methodNotAllowed } from './index'

describe('Method Not Allowed Middleware', () => {
  it('Should return 405 with an Allow header when the method is not allowed', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/', (c) => c.text('Hello World!'))

    const res = await app.request('/', { method: 'POST' })
    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET')
    expect(await res.text()).toBe('Method Not Allowed')
  })

  it('Should not affect a request whose method is allowed', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/', (c) => c.text('Hello World!'))

    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(res.headers.has('Allow')).toBe(false)
    expect(await res.text()).toBe('Hello World!')
  })

  it('Should return 404 when the path does not exist', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/', (c) => c.text('Hello World!'))

    const res = await app.request('/nonexistent', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('Should list every allowed method for a path', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/resource', (c) => c.text('GET'))
    app.post('/resource', (c) => c.text('POST'))
    app.delete('/resource', (c) => c.text('DELETE'))

    const res = await app.request('/resource', { method: 'PUT' })
    expect(res.status).toBe(405)
    const allow = res.headers.get('Allow')?.split(', ').sort()
    expect(allow).toEqual(['DELETE', 'GET', 'POST'])
  })

  it('Should exclude the requested method from the Allow header', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/resource', (c) => c.text('GET'))
    app.post('/resource', (c) => c.text('POST'))

    const res = await app.request('/resource', { method: 'POST', body: '' })
    // POST is registered, so this should not be a 405; falls through to handler
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('POST')
  })

  it('Should not produce duplicate methods in the Allow header', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    // Two routes match `/resource` via wildcard and exact path, both GET
    app.get('*', (_c, next) => next())
    app.get('/resource', (c) => c.text('GET'))

    const res = await app.request('/resource', { method: 'DELETE' })
    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET')
  })

  it('Should work with routes that have parameters', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/user/:id', (c) => c.text(`User ${c.req.param('id')}`))

    const res = await app.request('/user/123', { method: 'POST' })
    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET')
  })

  it('Should work alongside other middleware', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.use(async (c, next) => {
      await next()
      c.header('X-Powered-By', 'Hono')
    })
    app.get('/', (c) => c.text('Hello World!'))

    const res = await app.request('/', { method: 'POST' })
    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET')
  })

  it('Should work with app.route()', async () => {
    const app = new Hono()
    const api = new Hono()
    api.get('/hello', (c) => c.text('hello'))
    app.use(methodNotAllowed({ app }))
    app.route('/api', api)

    const res = await app.request('/api/hello', { method: 'POST' })
    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET')
  })

  it('Should support a HEAD request mapped from a GET route', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/', (c) => c.text('Hello World!'))

    const headRes = await app.request('/', { method: 'HEAD' })
    expect(headRes.status).toBe(200)

    const postRes = await app.request('/', { method: 'POST' })
    expect(postRes.status).toBe(405)
    expect(postRes.headers.get('Allow')).toBe('GET')
  })
})
