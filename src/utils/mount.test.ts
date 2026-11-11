import { Hono } from '../hono'
import { mount } from '../middleware/mount'
import type { ApplicationHandler, MountReplaceRequest } from '../middleware/mount'
import { PatternRouter } from '../router/pattern-router'
import { getPath } from './url'

describe.each([
  [
    'app.mount()',
    (
      app: Hono,
      path: string,
      handler: ApplicationHandler,
      replaceRequest?: MountReplaceRequest | false
    ) => app.mount(path, handler, { replaceRequest }),
  ],
  [
    'mount()',
    (
      app: Hono,
      path: string,
      handler: ApplicationHandler,
      replaceRequest?: MountReplaceRequest | false
    ) => app.all(`${path}/*`, mount(handler, { replaceRequest })),
  ],
] as const)('%s routed paths', (_name, register) => {
  it.each([
    ['/mount/admin%5Csecret', '/admin\\secret'],
    ['/mount/public%5C..%5Cadmin/secret', '/public\\..\\admin/secret'],
    ['/mount/ad%09min/secret', '/ad\tmin/secret'],
    ['/mount/ad%0Amin/secret', '/ad\nmin/secret'],
    ['/mount/ad%0Dmin/secret', '/ad\rmin/secret'],
  ])('Should preserve %s without reaching a protected route', async (input, expected) => {
    const child = new Hono()
    child.get('/admin/secret', (c) => c.text('SECRET'))
    child.get('*', (c) => c.text(c.req.path))
    const app = new Hono()
    app.all('/mount/admin/*', (c) => c.text('Unauthorized', 401))
    register(app, '/mount', child.fetch)

    const direct = await app.request('/mount/admin/secret')
    expect(direct.status).toBe(401)

    const res = await app.request(input)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(expected)
  })

  it.each([
    ['/hello', '/hello'],
    ['/public/admin/secret', '/public/admin/secret'],
    ['/public/%C3%A9', '/public/é'],
    ['/public/admin%2Fsecret', '/public/admin%2Fsecret'],
    ['/public/foo%252Fbar', '/public/foo%252Fbar'],
  ])('Should forward %s when getPath adds a prefix', async (input, expected) => {
    const app = new Hono({ getPath: (req) => '/example.com' + getPath(req) })
    app.all('/example.com/admin/*', (c) => c.text('Unauthorized', 401))
    register(app, '/example.com', (req) => new Response(getPath(req)))

    const res = await app.request(input)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(expected)
  })

  it.each(['/admin/secret', '/%61dmin/secret'])(
    'Should apply parent authentication to %s when getPath adds a host prefix',
    async (input) => {
      const app = new Hono({
        getPath: (req) => '/' + req.headers.get('host') + getPath(req),
      })
      const child = vi.fn(() => new Response('Unexpected forwarding'))
      app.all('/example.com/admin/*', (c) => c.text('Unauthorized', 401))
      register(app, '/example.com', child)

      const res = await app.request(input, { headers: { host: 'example.com' } })
      expect(res.status).toBe(401)
      expect(child).not.toHaveBeenCalled()
    }
  )

  it('Should forward the path rewritten by getPath', async () => {
    const app = new Hono({
      getPath: (req) => '/example.com' + getPath(req).replace('/skip/admin', ''),
    })
    app.all('/example.com/admin/*', (c) => c.text('Unauthorized', 401))
    register(app, '/example.com', (req) => new Response(getPath(req)))

    const res = await app.request('/public/skip/admin/secret')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/public/secret')
  })

  it('Should preserve a trailing slash added by getPath', async () => {
    const app = new Hono({ getPath: (req) => '/mount' + getPath(req) + '/' })
    register(app, '/mount', (req) => new Response(getPath(req)))

    const res = await app.request('/hello')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/hello/')
  })

  it.each([
    ['/mount/ad%8F%25min/secret', '/ad%8F%25min/secret'],
    ['/mount/%%36%31dmin/secret', '/%2561dmin/secret'],
    ['/mount/public/%%32%65%%32%65/admin/secret', '/public/%252e%252e/admin/secret'],
  ])('Should forward %s without changing its routed path', async (input, expected) => {
    const child = new Hono()
    child.get('/admin/secret', (c) => c.text('SECRET'))
    child.get('*', (c) => c.text(c.req.path))
    const app = new Hono()
    app.all('/mount/admin/secret', (c) => c.text('Unauthorized', 401))
    register(app, '/mount', child.fetch)

    expect((await app.request('/mount/admin/secret')).status).toBe(401)
    const res = await app.request(input)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(expected)
  })

  it.each([
    '/mount/%FF\\x',
    '/mount/%FF\t',
    '/mount/%FF\n',
    '/mount/%FF\r',
    '/mount/%FFé',
    '/mount/%C0%AF\\x',
  ])('Should reject %s when malformed encoding changes after serialization', async (input) => {
    const app = new Hono()
    const child = vi.fn(() => new Response('Unexpected forwarding'))
    register(app, '/mount', child)

    const req = new Request('http://localhost/')
    Object.defineProperty(req, 'url', { value: `http://localhost${input}` })
    const res = await app.fetch(req)
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid mounted path')
    expect(child).not.toHaveBeenCalled()
  })

  it.each(['/%FF', '/%FF%5Cx', '/%FF%25', '/100%', '/%G1', '/%FF/x'])(
    'Should forward stable malformed encoding in %s',
    async (path) => {
      const app = new Hono()
      const child = vi.fn((req: Request) => new Response(getPath(req)))
      register(app, '/mount', child)

      const res = await app.request(`/mount${path}`)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe(path)
      expect(child).toHaveBeenCalledOnce()
    }
  )

  it('Should not reach a protected route through malformed encoding', async () => {
    const app = new Hono()
    const child = new Hono()
    const secret = vi.fn((c) => c.text('SECRET'))
    app.all('/mount/%FF%5Cx', (c) => c.text('Unauthorized', 401))
    child.get('/%FF%5Cx', secret)
    register(app, '/mount', child.fetch)

    expect((await app.request('/mount/%FF%5Cx')).status).toBe(401)
    const req = new Request('http://localhost/')
    Object.defineProperty(req, 'url', { value: 'http://localhost/mount/%FF\\x' })
    expect((await app.fetch(req)).status).toBe(400)
    expect(secret).not.toHaveBeenCalled()
  })

  it('Should reject unstable malformed percent escapes returned by getPath', async () => {
    const app = new Hono({ getPath: () => '/mount/%%36%31dmin' })
    const child = vi.fn(() => new Response('Unexpected forwarding'))
    register(app, '/mount', child)

    expect((await app.request('/input')).status).toBe(400)
    expect(child).not.toHaveBeenCalled()
  })

  it('Should leave valid percent escapes from a custom getPath to the mounted app', async () => {
    const app = new Hono({ getPath: () => '/mount/%61' })
    register(app, '/mount', (req) => new Response(getPath(req)))

    const res = await app.request('/input')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/a')
  })

  it('Should keep invalid mount route errors as HTTP 500', async () => {
    const app = new Hono()
    const child = vi.fn(() => new Response('Unexpected forwarding'))
    register(app, '/mount/:id/:id', child)

    const res = await app.request('/mount/a/b/%FF%5Cx')
    expect(res.status).toBe(500)
    expect(child).not.toHaveBeenCalled()
  })

  it('Should return 500 for optional regular expression parameters with PatternRouter', async () => {
    const app = new Hono({ router: new PatternRouter() })
    const child = vi.fn(() => new Response('Unexpected forwarding'))
    register(app, '/mount/:id{[0-9]+}?', child)

    const res = await app.request('/mount/123456789012')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Internal Server Error')
    expect(child).not.toHaveBeenCalled()
  })

  it('Should apply parent authentication before a child with strict: false', async () => {
    const app = new Hono({ strict: false })
    const child = new Hono({ strict: false })
    const secret = vi.fn((c) => c.text('SECRET'))
    app.all('/mount/admin', (c) => c.text('Unauthorized', 401))
    child.get('/admin', secret)
    register(app, '/mount', child.fetch)

    for (const input of ['/mount/admin', '/mount/admin/']) {
      const res = await app.request(input)
      expect(res.status).toBe(401)
    }
    for (const input of ['/mount/admin//', '/mount/admin///']) {
      const res = await app.request(input)
      expect(res.status).toBe(400)
    }
    expect(secret).not.toHaveBeenCalled()
  })

  it('Should preserve repeated trailing slashes with a strict parent', async () => {
    const app = new Hono()
    register(app, '/mount', (req) => new Response(getPath(req)))

    const res = await app.request('/mount/hello//')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/hello//')
  })

  it('Should reject repeated slashes before calling a non-Hono child', async () => {
    const app = new Hono({ strict: false })
    const child = vi.fn(() => new Response('Unexpected forwarding'))
    register(app, '/mount', child)

    const res = await app.request('/mount/hello//')
    expect(res.status).toBe(400)
    expect(child).not.toHaveBeenCalled()
  })

  it.each([
    '/mount/public/../admin/secret',
    '/mount/public/%2E%2E/admin/secret',
    '/mount/public/.%2e/admin/secret',
    '/mount/./admin/secret',
    '/mount/public/..',
  ])('Should reject %s when the request URL is not normalized', async (input) => {
    const app = new Hono()
    const child = vi.fn(() => new Response('Unexpected forwarding'))
    app.all('/mount/admin/*', (c) => c.text('Unauthorized', 401))
    register(app, '/mount', child)

    // Some runtimes pass the request target through without normalizing it.
    const req = new Request('http://localhost/')
    Object.defineProperty(req, 'url', { value: `http://localhost${input}` })
    const res = await app.fetch(req)
    expect(res.status).toBe(400)
    expect(child).not.toHaveBeenCalled()
  })

  it('Should not count a backslash as a trailing slash with a strict parent', async () => {
    const app = new Hono()
    register(app, '/mount', (req) => new Response(getPath(req)))

    const req = new Request('http://localhost/')
    Object.defineProperty(req, 'url', { value: 'http://localhost/mount/hello\\/' })
    const res = await app.fetch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/hello\\/')
  })

  it('Should reject repeated slashes after a backslash with strict: false', async () => {
    const app = new Hono({ strict: false })
    const child = vi.fn(() => new Response('Unexpected forwarding'))
    register(app, '/mount', child)

    const req = new Request('http://localhost/')
    Object.defineProperty(req, 'url', { value: 'http://localhost/mount/hello\\//' })
    const res = await app.fetch(req)
    expect(res.status).toBe(400)
    expect(child).not.toHaveBeenCalled()
  })

  it.each(['http://localhost?', 'http://localhost#', 'http://localhost\\'])(
    'Should reject the request URL authority %s',
    async (origin) => {
      const app = new Hono()
      const child = vi.fn(() => new Response('Unexpected forwarding'))
      register(app, '/mount', child)

      const req = new Request('http://localhost/')
      Object.defineProperty(req, 'url', { value: `${origin}/mount/hello` })
      const res = await app.fetch(req)
      expect(res.status).toBe(400)
      expect(child).not.toHaveBeenCalled()
    }
  )

  it('Should apply parent authentication when the authority hides repeated slashes', async () => {
    const app = new Hono({ strict: false })
    const child = new Hono({ strict: false })
    const secret = vi.fn((c) => c.text('SECRET'))
    app.all('/mount/admin', (c) => c.text('Unauthorized', 401))
    child.get('/admin', secret)
    register(app, '/mount', child.fetch)

    const req = new Request('http://localhost/')
    Object.defineProperty(req, 'url', { value: 'http://localhost?/mount/admin//' })
    const res = await app.fetch(req)
    expect(res.status).toBe(400)
    expect(secret).not.toHaveBeenCalled()
  })

  it.each(['http://LOCALHOST:8000', 'http://[::1]:8000'])(
    'Should forward with the request URL authority %s',
    async (origin) => {
      const app = new Hono()
      register(app, '/mount', (req) => new Response(getPath(req)))

      const req = new Request('http://localhost/')
      Object.defineProperty(req, 'url', { value: `${origin}/mount/hello` })
      const res = await app.fetch(req)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/hello')
    }
  )

  it('Should reject dot segments left encoded by getPath', async () => {
    const app = new Hono({ getPath: () => '/mount/public/%2e%2E/admin/secret' })
    const child = vi.fn(() => new Response('Unexpected forwarding'))
    register(app, '/mount', child)

    const res = await app.request('/input')
    expect(res.status).toBe(400)
    expect(child).not.toHaveBeenCalled()
  })

  it.each(['/mount/.../x', '/mount/..x/.y', '/mount/x../y.'])(
    'Should forward %s unchanged',
    async (input) => {
      const app = new Hono()
      register(app, '/mount', (req) => new Response(getPath(req)))

      const res = await app.request(input)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe(input.slice('/mount'.length))
    }
  )

  it.each([
    [false, '/input'],
    [(req: Request) => new Request('http://localhost/custom', req), '/custom'],
  ] as const)('Should honor replaceRequest: %s', async (replaceRequest, expected) => {
    for (const path of ['/mount/../admin/secret', '/mount/%FF\\x']) {
      const app = new Hono({ getPath: () => path })
      register(app, '/mount', (req) => new Response(getPath(req)), replaceRequest)

      const res = await app.request('/input')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe(expected)
    }
  })

  it('Should preserve the method, query, headers and body when rewriting the path', async () => {
    const app = new Hono({ getPath: () => '/mount/rewritten' })
    register(app, '/mount', async (req) =>
      Response.json({
        path: getPath(req),
        method: req.method,
        query: new URL(req.url).search,
        header: req.headers.get('x-test'),
        body: await req.text(),
      })
    )

    const res = await app.request('/input?key=value', {
      method: 'POST',
      headers: { 'x-test': 'kept' },
      body: 'body',
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      path: '/rewritten',
      method: 'POST',
      query: '?key=value',
      header: 'kept',
      body: 'body',
    })
  })
})

it.each([
  ['app.mount()', (app: Hono, handler: ApplicationHandler) => app.mount('/', handler)],
  ['mount()', (app: Hono, handler: ApplicationHandler) => app.all('/*', mount(handler))],
] as const)('%s should reject repeated slashes at the root mount', async (_name, register) => {
  const app = new Hono({ strict: false })
  const child = vi.fn(() => new Response('Unexpected forwarding'))
  register(app, child)

  const res = await app.request('/hello//')
  expect(res.status).toBe(400)
  expect(child).not.toHaveBeenCalled()
})
