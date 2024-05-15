import type { ExecutionContext } from '../../context'
import { Hono } from '../../hono'
import { cache } from '.'

// Mock
class Context implements ExecutionContext {
  passThroughOnException(): void {
    throw new Error('Method not implemented.')
  }
  async waitUntil(promise: Promise<unknown>): Promise<void> {
    await promise
  }
}

describe('Customizing Caching Keys', () => {
  const app = new Hono()

  const dynamicCacheName = 'dynamic-cache-name'
  app.use(
    '/dynamic-cache-name/*',
    cache({
      cacheName: async () => dynamicCacheName,
      wait: true,
      cacheControl: 'max-age=10',
    })
  )
  app.get('/dynamic-cache-name/', (c) => {
    return c.text('cached')
  })

  const dynamicCacheKey = 'dynamic-cache-key'
  app.use(
    '/dynamic-cache-key/*',
    cache({
      cacheName: 'my-app-v1',
      wait: true,
      cacheControl: 'max-age=10',
      keyGenerator: async () => dynamicCacheKey,
    })
  )
  app.get('/dynamic-cache-key/', (c) => {
    return c.text('cached')
  })

  app.use(
    '/dynamic-cache/*',
    cache({
      cacheName: async () => dynamicCacheName,
      cacheControl: 'max-age=10',
      keyGenerator: async () => dynamicCacheKey,
    })
  )
  app.get('/dynamic-cache/', (c) => {
    return c.text('cached')
  })

  const ctx = new Context()

  it('Should use dynamically generated cache name', async () => {
    await app.request('http://localhost/dynamic-cache-name/', undefined, ctx)
    const cache = await caches.open(dynamicCacheName)
    const keys = Array.from(await cache.keys())
    expect(keys.length).toBe(1)
  })

  it('Should use dynamically generated cache key', async () => {
    await app.request('http://localhost/dynamic-cache-key/')
    const cache = await caches.open('my-app-v1')
    const response = await cache.match(dynamicCacheKey)
    expect(response).not.toBeNull()
  })

  it('Should retrieve cached response with dynamic cache name and key', async () => {
    await app.request('http://localhost/dynamic-cache/', undefined, undefined, ctx)
    const res = await app.request('http://localhost/dynamic-cache/', undefined, undefined, ctx)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('max-age=10')
  })
})

describe('Cache Middleware', () => {
  const app = new Hono()

  let count = 1
  // wait, because this is test.
  // You don't have to set `wait: true`.
  app.use('/wait/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))
  app.get('/wait/', (c) => {
    c.header('X-Count', `${count}`)
    count++
    return c.text('cached')
  })

  // Default, use `waitUntil`
  app.use('/not-wait/*', cache({ cacheName: 'my-app-v1', cacheControl: 'max-age=10' }))
  app.get('/not-wait/', (c) => {
    return c.text('not cached')
  })

  app.use('/wait2/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))
  app.use('/wait2/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'Max-Age=20' }))
  app.get('/wait2/', (c) => {
    return c.text('cached')
  })

  app.use('/wait3/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))
  app.use(
    '/wait3/private/*',
    cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'private' })
  )
  app.get('/wait3/private/', (c) => {
    return c.text('cached')
  })

  app.use('/wait4/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))
  app.get('/wait4/', (c) => {
    c.header('Cache-Control', 'private')
    return c.text('cached')
  })

  app.use('/vary1/*', cache({ cacheName: 'my-app-v1', wait: true, vary: ['Accept'] }))
  app.get('/vary1/', (c) => {
    return c.text('cached')
  })

  app.use('/vary2/*', cache({ cacheName: 'my-app-v1', wait: true, vary: ['Accept'] }))
  app.get('/vary2/', (c) => {
    c.header('Vary', 'Accept-Encoding')
    return c.text('cached')
  })

  app.use(
    '/vary3/*',
    cache({ cacheName: 'my-app-v1', wait: true, vary: ['Accept', 'Accept-Encoding'] })
  )
  app.get('/vary3/', (c) => {
    c.header('Vary', 'Accept-Language')
    return c.text('cached')
  })

  app.use(
    '/vary4/*',
    cache({ cacheName: 'my-app-v1', wait: true, vary: ['Accept', 'Accept-Encoding'] })
  )
  app.get('/vary4/', (c) => {
    c.header('Vary', 'Accept, Accept-Language')
    return c.text('cached')
  })

  app.use('/vary5/*', cache({ cacheName: 'my-app-v1', wait: true, vary: 'Accept' }))
  app.get('/vary5/', (c) => {
    return c.text('cached with Accept and Accept-Encoding headers')
  })

  app.use(
    '/vary6/*',
    cache({ cacheName: 'my-app-v1', wait: true, vary: 'Accept, Accept-Encoding' })
  )
  app.get('/vary6/', (c) => {
    c.header('Vary', 'Accept, Accept-Language')
    return c.text('cached with Accept and Accept-Encoding headers as array')
  })

  app.use('/vary7/*', cache({ cacheName: 'my-app-v1', wait: true, vary: ['Accept'] }))
  app.get('/vary7/', (c) => {
    c.header('Vary', '*')
    return c.text('cached')
  })

  app.use(
    '/not-found/*',
    cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10', vary: ['Accept'] })
  )

  const ctx = new Context()

  it('Should return cached response', async () => {
    await app.request('http://localhost/wait/')
    const res = await app.request('http://localhost/wait/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('max-age=10')
    expect(res.headers.get('x-count')).toBe('1')
  })

  it('Should not return cached response', async () => {
    await app.fetch(new Request('http://localhost/not-wait/'), undefined, ctx)
    const res = await app.fetch(new Request('http://localhost/not-wait/'), undefined, ctx)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('max-age=10')
  })

  it('Should not return duplicate header values', async () => {
    const res = await app.request('/wait2/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('max-age=20')
  })

  it('Should return composed middleware header values', async () => {
    const res = await app.request('/wait3/private/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, max-age=10')
  })

  it('Should return composed handler header values', async () => {
    const res = await app.request('/wait4/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, max-age=10')
  })

  it('Should correctly apply a single Vary header from middleware', async () => {
    const res = await app.request('http://localhost/vary1/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('vary')).toBe('accept')
  })

  it('Should merge Vary headers from middleware and handler without duplicating', async () => {
    const res = await app.request('http://localhost/vary2/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('vary')).toBe('accept, accept-encoding')
  })

  it('Should deduplicate while merging multiple Vary headers from middleware and handler', async () => {
    const res = await app.request('http://localhost/vary3/')
    expect(res.headers.get('vary')).toBe('accept, accept-encoding, accept-language')
  })

  it('Should prevent duplication of Vary headers when identical ones are set by both middleware and handler', async () => {
    const res = await app.request('http://localhost/vary4/')
    expect(res.headers.get('vary')).toBe('accept, accept-encoding, accept-language')
  })

  it('Should correctly apply and return a single Vary header with Accept specified by middleware', async () => {
    const res = await app.request('http://localhost/vary5/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('vary')).toBe('accept')
  })

  it('Should merge Vary headers specified by middleware as a string with additional headers added by handler', async () => {
    const res = await app.request('http://localhost/vary6/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('vary')).toBe('accept, accept-encoding, accept-language')
  })

  it('Should prioritize the "*" Vary header from handler over any set by middleware', async () => {
    const res = await app.request('http://localhost/vary7/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('vary')).toBe('*')
  })

  it('Should not allow "*" as a Vary header in middleware configuration due to its impact on caching effectiveness', async () => {
    expect(() => cache({ cacheName: 'my-app-v1', wait: true, vary: ['*'] })).toThrow()
    expect(() => cache({ cacheName: 'my-app-v1', wait: true, vary: '*' })).toThrow()
  })

  it('Should not cache if it is not found', async () => {
    const res = await app.request('/not-found/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBeFalsy()
    expect(res.headers.get('vary')).toBeFalsy()
  })

  it('Should not be enabled if caches is not defined', async () => {
    vi.stubGlobal('caches', undefined)
    const app = new Hono()
    app.use(cache({ cacheName: 'my-app-v1', cacheControl: 'max-age=10' }))
    app.get('/', (c) => {
      return c.text('cached')
    })
    expect(caches).toBeUndefined()
    const res = await app.request('/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe(null)
  })
})
