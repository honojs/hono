import { Hono } from '../../hono'
import { methodNotAllowed } from '.'

describe('Method Not Allowed Middleware', () => {
  it('infers the environment from the app', () => {
    const app = new Hono<{ Variables: { requestId: string } }>()
    const middleware = methodNotAllowed({
      app,
      onMethodNotAllowed: (c) => c.text(c.var.requestId, 405),
    })

    expect(middleware).toBeTypeOf('function')
  })

  it('returns 405 with every allowed method for an existing path', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/resource', (c) => c.text('GET'))
    app.post('/resource', (c) => c.text('POST'))
    app.delete('/resource', (c) => c.text('DELETE'))

    const res = await app.request('/resource', { method: 'PUT' })

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET, HEAD, POST, DELETE')
    expect(await res.text()).toBe('Method Not Allowed')

    const resUsingCachedRouter = await app.request('/resource', { method: 'OPTIONS' })
    expect(resUsingCachedRouter.status).toBe(405)
    expect(resUsingCachedRouter.headers.get('Allow')).toBe('GET, HEAD, POST, DELETE')
  })

  it('does not affect an allowed method', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/resource', (c) => c.text('GET'))

    const res = await app.request('/resource')

    expect(res.status).toBe(200)
    expect(res.headers.has('Allow')).toBe(false)
    expect(await res.text()).toBe('GET')
  })

  it('returns 404 when the path does not exist', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/resource', (c) => c.text('GET'))

    const res = await app.request('/missing', { method: 'POST' })

    expect(res.status).toBe(404)
    expect(res.headers.has('Allow')).toBe(false)
  })

  it('matches parameterized and overlapping routes without duplicate methods', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/users/:id', (_c, next) => next())
    app.get('/users/me', (c) => c.text('me'))
    app.patch('/users/:id', (c) => c.text(c.req.param('id')))

    const res = await app.request('/users/me', { method: 'POST' })

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET, HEAD, PATCH')
  })

  it('preserves an intentional 404 from a handler registered for the request method', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/users/:id', (c) => c.notFound())
    app.post('/users/:id', (c) => c.text('Created'))

    const res = await app.request('/users/123')

    expect(res.status).toBe(404)
    expect(res.headers.has('Allow')).toBe(false)
  })

  it('preserves an intentional 404 for HEAD when a GET route is registered', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/users/:id', (c) => c.notFound())
    app.post('/users/:id', (c) => c.text('Created'))

    const res = await app.request('/users/123', { method: 'HEAD' })

    expect(res.status).toBe(404)
    expect(res.headers.has('Allow')).toBe(false)
  })

  it('preserves a 404 returned by the error handler', async () => {
    const app = new Hono()
    app.onError((_error, c) => c.text('Handled error', 404))
    app.use(methodNotAllowed({ app }))
    app.use('/resource', () => {
      throw new Error('boom')
    })
    app.get('/resource', (c) => c.text('GET'))

    const res = await app.request('/resource', { method: 'POST' })

    expect(res.status).toBe(404)
    expect(res.headers.has('Allow')).toBe(false)
    expect(await res.text()).toBe('Handled error')
  })

  it('returns 405 for HEAD when the path does not support GET', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.post('/resource', (c) => c.text('POST'))

    const res = await app.request('/resource', { method: 'HEAD' })

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('POST')
    expect(await res.text()).toBe('')
  })

  it('does not advertise explicit HEAD routes that Hono cannot dispatch', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.on('HEAD', '/resource', (c) => c.text('HEAD'))

    const headRes = await app.request('/resource', { method: 'HEAD' })
    expect(headRes.status).toBe(404)
    expect(headRes.headers.has('Allow')).toBe(false)

    const putRes = await app.request('/resource', { method: 'PUT' })
    expect(putRes.status).toBe(404)
    expect(putRes.headers.has('Allow')).toBe(false)
  })

  it('supports custom methods', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.on('PURGE', '/cache', (c) => c.text('Purged'))

    const res = await app.request('/cache', { method: 'POST' })

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('PURGE')
  })

  it('compares request methods case-sensitively', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.patch('/item', (c) => c.text('PATCH'))

    const request = new Request('http://localhost/item', { method: 'PATCH' })
    Object.defineProperty(request, 'method', { value: 'patch' })
    const res = await app.request(request)

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('PATCH')
  })

  it('works with routes mounted using app.route()', async () => {
    const api = new Hono()
    api.get('/resource', (c) => c.text('GET'))
    api.post('/resource', (c) => c.text('POST'))

    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.route('/api', api)

    const res = await app.request('/api/resource', { method: 'DELETE' })

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET, HEAD, POST')
  })

  it('works when installed in an app mounted using app.route()', async () => {
    const api = new Hono().basePath('/v1')
    api.use(methodNotAllowed({ app: api }))
    api.get('/resource', (c) => c.text('GET'))
    api.post('/resource', (c) => c.text('POST'))

    const app = new Hono()
    app.route('/api', api)

    const res = await app.request('/api/v1/resource', { method: 'DELETE' })

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET, HEAD, POST')
  })

  it('ignores ALL routes when collecting allowed methods', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.all('/resource', (_c, next) => next())

    const res = await app.request('/resource', { method: 'POST' })

    expect(res.status).toBe(404)
    expect(res.headers.has('Allow')).toBe(false)
  })

  it('does not invoke the error handler for a 405 response', async () => {
    const app = new Hono()
    const onError = vi.fn(() => new Response('error', { status: 500 }))
    app.onError(onError)
    app.use(methodNotAllowed({ app }))
    app.get('/resource', (c) => c.text('GET'))

    const res = await app.request('/resource', { method: 'POST' })

    expect(res.status).toBe(405)
    expect(onError).not.toHaveBeenCalled()
  })

  it('preserves downstream headers and lets outer middleware observe the final status', async () => {
    const app = new Hono()
    let observedStatus: number | undefined

    app.use(async (c, next) => {
      await next()
      observedStatus = c.res.status
    })
    app.use(methodNotAllowed({ app }))
    app.use(async (c, next) => {
      await next()
      c.header('X-Downstream', 'true')
    })
    app.get('/resource', (c) => c.text('GET'))

    const res = await app.request('/resource', { method: 'POST' })

    expect(res.status).toBe(405)
    expect(res.headers.get('X-Downstream')).toBe('true')
    expect(observedStatus).toBe(405)
  })

  it('replaces stale representation headers from the not-found response', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/resource', (c) => c.text('GET'))
    app.post('/resource', (c) => c.text('POST'))
    app.notFound((c) =>
      c.text('Missing', 404, {
        Allow: 'BOGUS',
        'Content-Length': '7',
      })
    )

    const res = await app.request('/resource', { method: 'PUT' })

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET, HEAD, POST')
    expect(res.headers.has('Content-Length')).toBe(false)
    expect(await res.text()).toBe('Method Not Allowed')
  })

  it('supports a custom method-not-allowed response', async () => {
    const app = new Hono()
    app.use(
      methodNotAllowed({
        app,
        onMethodNotAllowed: (c, allowedMethods) =>
          c.json({ error: 'Method Not Allowed', allowedMethods }, 405, {
            Allow: allowedMethods.join(', '),
          }),
      })
    )
    app.get('/resource', (c) => c.text('GET'))
    app.post('/resource', (c) => c.text('POST'))

    const res = await app.request('/resource', { method: 'PUT' })

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET, HEAD, POST')
    expect(res.headers.get('Content-Type')).toMatch(/^application\/json/)
    expect(await res.json()).toEqual({
      error: 'Method Not Allowed',
      allowedMethods: ['GET', 'HEAD', 'POST'],
    })
  })

  it('leaves a non-404 custom not-found response unchanged', async () => {
    const app = new Hono()
    app.use(methodNotAllowed({ app }))
    app.get('/resource', (c) => c.text('GET'))
    app.notFound((c) => c.text('Missing', 410))

    const res = await app.request('/resource', { method: 'POST' })

    expect(res.status).toBe(410)
    expect(res.headers.has('Allow')).toBe(false)
    expect(await res.text()).toBe('Missing')
  })
})
