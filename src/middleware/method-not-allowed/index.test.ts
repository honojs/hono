import { Hono } from '../../hono'
import { methodNotAllowed } from '.'

describe('Method Not Allowed Middleware', () => {
  const app = new Hono()

  app.use(methodNotAllowed({ app }))

  app.get('/hello', (c) => c.text('Hello!'))
  app.post('/hello', (c) => c.text('Posted!'))
  app.get('/users/:id', (c) => c.text(`User ${c.req.param('id')}`))
  app.put('/users/:id', (c) => c.text(`Updated ${c.req.param('id')}`))
  app.delete('/users/:id', (c) => c.text(`Deleted ${c.req.param('id')}`))

  it('Should return 200 for a valid GET request', async () => {
    const res = await app.request('/hello')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello!')
  })

  it('Should return 200 for a valid POST request', async () => {
    const res = await app.request('/hello', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Posted!')
  })

  it('Should return 405 for an unsupported method on an existing path', async () => {
    const res = await app.request('/hello', { method: 'PUT' })
    expect(res.status).toBe(405)
    expect(await res.text()).toBe('Method Not Allowed')
  })

  it('Should include Allow header listing permitted methods', async () => {
    const res = await app.request('/hello', { method: 'DELETE' })
    expect(res.status).toBe(405)
    const allow = res.headers.get('Allow')
    expect(allow).toBeTruthy()
    expect(allow!.split(', ')).toEqual(expect.arrayContaining(['GET', 'POST']))
  })

  it('Should return 404 for a path that does not exist', async () => {
    const res = await app.request('/nonexistent')
    expect(res.status).toBe(404)
  })

  it('Should return 405 with correct Allow header for parameterized routes', async () => {
    const res = await app.request('/users/123', { method: 'POST' })
    expect(res.status).toBe(405)
    const allow = res.headers.get('Allow')
    expect(allow).toBeTruthy()
    expect(allow!.split(', ')).toEqual(expect.arrayContaining(['GET', 'PUT', 'DELETE']))
  })

  it('Should return 200 for a valid parameterized route', async () => {
    const res = await app.request('/users/456')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('User 456')
  })

  it('Should not include the request method in the Allow header', async () => {
    const res = await app.request('/hello', { method: 'PUT' })
    const allow = res.headers.get('Allow')
    expect(allow).toBeTruthy()
    expect(allow!.split(', ')).not.toContain('PUT')
  })
})

describe('Method Not Allowed with other middleware', () => {
  const app = new Hono()

  app.use(methodNotAllowed({ app }))

  // Add another middleware alongside methodNotAllowed
  app.use(async (c, next) => {
    await next()
    c.res.headers.set('X-Custom', 'test')
  })

  app.get('/api/data', (c) => c.json({ data: 'ok' }))

  it('Should return 405 even when other middleware is present', async () => {
    const res = await app.request('/api/data', { method: 'DELETE' })
    expect(res.status).toBe(405)
    expect(await res.text()).toBe('Method Not Allowed')
  })

  it('Should not interfere with successful requests', async () => {
    const res = await app.request('/api/data')
    expect(res.status).toBe(200)
  })
})

describe('Method Not Allowed with sub-applications', () => {
  const sub = new Hono()
  sub.get('/info', (c) => c.text('Info'))
  sub.post('/info', (c) => c.text('Created'))

  const app = new Hono()
  app.use(methodNotAllowed({ app }))
  app.route('/sub', sub)

  it('Should return 405 for unsupported method on sub-app route', async () => {
    const res = await app.request('/sub/info', { method: 'DELETE' })
    expect(res.status).toBe(405)
    const allow = res.headers.get('Allow')
    expect(allow).toBeTruthy()
    expect(allow!.split(', ')).toEqual(expect.arrayContaining(['GET', 'POST']))
  })

  it('Should return 200 for valid sub-app route', async () => {
    const res = await app.request('/sub/info')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Info')
  })
})

describe('Method Not Allowed with HEAD requests', () => {
  const app = new Hono()
  app.use(methodNotAllowed({ app }))
  app.get('/page', (c) => c.text('Page content'))

  it('Should return 200 for HEAD on a GET route (Hono handles HEAD automatically)', async () => {
    const res = await app.request('/page', { method: 'HEAD' })
    // Hono automatically supports HEAD for GET routes
    expect(res.status).toBe(200)
  })
})

describe('Method Not Allowed with OPTIONS requests', () => {
  const app = new Hono()
  app.use(methodNotAllowed({ app }))
  app.get('/resource', (c) => c.text('Resource'))
  app.options('/resource', () => {
    return new Response(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } })
  })

  it('Should return 204 for OPTIONS when explicitly defined', async () => {
    const res = await app.request('/resource', { method: 'OPTIONS' })
    expect(res.status).toBe(204)
  })

  it('Should return 405 for unsupported method', async () => {
    const res = await app.request('/resource', { method: 'PATCH' })
    expect(res.status).toBe(405)
  })
})

describe('Method Not Allowed with all methods on one path', () => {
  const app = new Hono()
  app.use(methodNotAllowed({ app }))
  app.all('/catch-all', (c) => c.text('Caught'))

  it('Should not return 405 when app.all is used (any method is valid)', async () => {
    const res = await app.request('/catch-all', { method: 'PATCH' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Caught')
  })
})
