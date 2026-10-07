import { getRouterName } from '../helper/dev'
import { Hono } from './quick'

describe('hono/quick preset', () => {
  it('Should have SmartRouter + LinearRouter', async () => {
    const app = new Hono()
    expect(getRouterName(app)).toBe('SmartRouter + LinearRouter')
  })

  it('Should keep LinearRouter for fallbacks mounted under a parameter', async () => {
    const app = new Hono()
    const sub = new Hono()
    sub.get('/ok', (c) => c.text('OK'))
    sub.get('/error', () => {
      throw new Error('Route error')
    })
    sub.get('/explicit', (c) => c.notFound())
    sub.onError((c) => c.text(`Caught: ${c.req.param('tenant')}`, 500))
    sub.onNotFound((c) => c.text('Tenant not found', 404))
    app.route('/:tenant', sub)

    const ok = await app.request('/acme/ok')
    expect(await ok.text()).toBe('OK')
    const error = await app.request('/acme/error')
    expect(error.status).toBe(500)
    expect(await error.text()).toBe('Caught: acme')
    for (const path of ['/acme/explicit', '/acme/missing', '/acme']) {
      const res = await app.request(path)
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Tenant not found')
    }
    expect(getRouterName(app)).toBe('SmartRouter + LinearRouter')
  })

  it.each([
    ['/:id{[a-z]+?}/*', '/foobar/x'],
    ['/:id{[a-z]+?}/:item/*', '/foobar/123/detail'],
    ['/:id{[a-z]+?}/:item{[0-9]+?}/*', '/foobar/123/detail'],
  ] as const)('Should match %s with LinearRouter', async (route, path) => {
    const app = new Hono()
    app.get(route, (c) => c.text(c.req.param('id')))

    const res = await app.request(path)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('foobar')
    expect(getRouterName(app)).toBe('SmartRouter + LinearRouter')
  })

  it('Should select TrieRouter when only fallback routes need it', async () => {
    const app = new Hono()
    app.get('/ok', (c) => c.text('OK'))
    app.get('/abc/error', () => {
      throw new Error('Route error')
    })
    app.get('/abc/explicit', (c) => c.notFound())
    app.onError('/:id{.*}/*', (c) => c.text(`Caught: ${c.error!.message}`, 500))
    app.onNotFound('/:id{.*}/*', (c) => c.text('Not found', 404))

    expect(await (await app.request('/ok')).text()).toBe('OK')
    expect(getRouterName(app)).toBe('SmartRouter + TrieRouter')
    const error = await app.request('/abc/error')
    expect(error.status).toBe(500)
    expect(await error.text()).toBe('Caught: Route error')
    for (const path of ['/abc/explicit', '/abc/missing']) {
      const res = await app.request(path)
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Not found')
    }
  })

  it('Should match an end-anchored parameter before a wildcard with LinearRouter', async () => {
    const app = new Hono()
    app.get('/:id{[0-9]+$}/*', (c) => c.text(c.req.param('id')))

    const res = await app.request('/123/bar')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('123')
    expect(getRouterName(app)).toBe('SmartRouter + LinearRouter')
  })

  it('Should match fallback scopes mounted under an end-anchored parameter', async () => {
    const app = new Hono()
    const sub = new Hono()
    app.get('/123/error', () => {
      throw new Error('Route error')
    })
    app.get('/123/explicit', (c) => c.notFound())
    sub.onError((c) => c.text(`Caught: ${c.error!.message}`, 500))
    sub.onNotFound((c) => c.text('Scoped not found', 404))
    app.route('/:id{[0-9]+$}', sub)

    const error = await app.request('/123/error')
    expect(error.status).toBe(500)
    expect(await error.text()).toBe('Caught: Route error')
    for (const path of ['/123/explicit', '/123/missing', '/123', '/123/']) {
      const res = await app.request(path)
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Scoped not found')
    }
    const outside = await app.request('/abc/missing')
    expect(outside.status).toBe(404)
    expect(await outside.text()).toBe('404 Not Found')
    expect(getRouterName(app)).toBe('SmartRouter + LinearRouter')
  })
})

describe('Generics for Bindings and Variables', () => {
  interface CloudflareBindings {
    MY_VARIABLE: string
  }

  it('Should not throw type errors', () => {
    // @ts-expect-error Bindings should extend object
    new Hono<{
      Bindings: number
    }>()

    const appWithInterface = new Hono<{
      Bindings: CloudflareBindings
    }>()

    appWithInterface.get('/', (c) => {
      expectTypeOf(c.env.MY_VARIABLE).toMatchTypeOf<string>()
      return c.text('/')
    })

    const appWithType = new Hono<{
      Bindings: {
        foo: string
      }
    }>()

    appWithType.get('/', (c) => {
      expectTypeOf(c.env.foo).toMatchTypeOf<string>()
      return c.text('Hello Hono!')
    })
  })
})
