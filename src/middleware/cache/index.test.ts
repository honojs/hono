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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any
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

  let varyWildcardOnlyCount = 0
  app.use('/vary-wildcard/*', cache({ cacheName: 'vary-wildcard-test', wait: true }))
  app.get('/vary-wildcard/only', (c) => {
    varyWildcardOnlyCount++
    c.header('X-Count', `${varyWildcardOnlyCount}`)
    c.header('Vary', '*')
    return c.text('response')
  })

  let varyWildcardFirstCount = 0
  app.get('/vary-wildcard/first', (c) => {
    varyWildcardFirstCount++
    c.header('X-Count', `${varyWildcardFirstCount}`)
    c.header('Vary', '*, Accept')
    return c.text('response')
  })

  let varyWildcardMiddleCount = 0
  app.get('/vary-wildcard/middle', (c) => {
    varyWildcardMiddleCount++
    c.header('X-Count', `${varyWildcardMiddleCount}`)
    c.header('Vary', 'Accept, *')
    return c.text('response')
  })

  let varyWildcardComplexCount = 0
  app.get('/vary-wildcard/complex', (c) => {
    varyWildcardComplexCount++
    c.header('X-Count', `${varyWildcardComplexCount}`)
    c.header('Vary', 'Accept, *, Accept-Encoding')
    return c.text('response')
  })

  let varyWildcardSpacesCount = 0
  app.get('/vary-wildcard/spaces', (c) => {
    varyWildcardSpacesCount++
    c.header('X-Count', `${varyWildcardSpacesCount}`)
    c.header('Vary', ' * ')
    return c.text('response')
  })

  app.use('/default/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))
  app.all('/default/:code/', (c) => {
    const code = parseInt(c.req.param('code'))
    // Intended to avoid the following error: `RangeError: init[“status”] must be in the range of 200 to 599, inclusive.`
    const res = {
      status: code,
      headers: new Headers(),
      clone: () => res,
    } as Response
    return res
  })

  app.use(
    '/custom/*',
    cache({
      cacheName: 'my-app-v1',
      wait: true,
      cacheControl: 'max-age=10',
      cacheableStatusCodes: [200, 201],
    })
  )
  app.get('/custom/:code/', (c) => {
    const code = parseInt(c.req.param('code'))
    // Intended to avoid the following error: `RangeError: init[“status”] must be in the range of 200 to 599, inclusive.`
    const res = {
      status: code,
      headers: new Headers(),
      clone: () => res,
    } as Response
    return res
  })

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

  it('Should not cache response when Vary: * is set', async () => {
    await app.request('http://localhost/vary-wildcard/only')
    const res = await app.request('http://localhost/vary-wildcard/only')
    expect(res.headers.get('x-count')).toBe('2')
  })

  it('Should not cache response when Vary: *, Accept is set', async () => {
    await app.request('http://localhost/vary-wildcard/first')
    const res = await app.request('http://localhost/vary-wildcard/first')
    expect(res.headers.get('x-count')).toBe('2')
  })

  it('Should not cache response when Vary: Accept, * is set', async () => {
    await app.request('http://localhost/vary-wildcard/middle')
    const res = await app.request('http://localhost/vary-wildcard/middle')
    expect(res.headers.get('x-count')).toBe('2')
  })

  it('Should not cache response when Vary: Accept, *, Accept-Encoding is set', async () => {
    await app.request('http://localhost/vary-wildcard/complex')
    const res = await app.request('http://localhost/vary-wildcard/complex')
    expect(res.headers.get('x-count')).toBe('2')
  })

  it('Should not cache response when Vary contains * with extra spaces', async () => {
    await app.request('http://localhost/vary-wildcard/spaces')
    const res = await app.request('http://localhost/vary-wildcard/spaces')
    expect(res.headers.get('x-count')).toBe('2')
  })

  it.each([200])('Should cache %i in default cacheable status codes', async (code) => {
    await app.request(`http://localhost/default/${code}/`)
    const res = await app.request(`http://localhost/default/${code}/`)
    expect(res).not.toBeNull()
    expect(res.status).toBe(code)
    expect(res.headers.get('cache-control')).toBe('max-age=10')
  })

  it.each([
    100, 101, 102, 103, 201, 202, 205, 207, 208, 226, 302, 303, 304, 307, 308, 400, 401, 402, 403,
    406, 407, 408, 409, 411, 412, 413, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429,
    431, 451, 500, 502, 503, 504, 505, 506, 507, 508, 510, 511,
  ])('Should not cache %i in default cacheable status codes', async (code) => {
    await app.request(`http://localhost/default/${code}/`)
    const res = await app.request(`http://localhost/default/${code}/`)
    expect(res).not.toBeNull()
    expect(res.status).toBe(code)
    expect(res.headers.get('cache-control')).not.toBe('max-age=10')
  })

  it.each([200, 201])('Should cache %i in custom cacheable status codes', async (code) => {
    await app.request(`http://localhost/custom/${code}/`)
    const res = await app.request(`http://localhost/custom/${code}/`)
    expect(res).not.toBeNull()
    expect(res.status).toBe(code)
    expect(res.headers.get('cache-control')).toBe('max-age=10')
  })

  it.each([
    100, 101, 102, 103, 202, 205, 207, 208, 226, 302, 303, 304, 307, 308, 400, 401, 402, 403, 406,
    407, 408, 409, 411, 412, 413, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431,
    451, 500, 502, 503, 504, 505, 506, 507, 508, 510, 511,
  ])('Should not cache %i in custom cacheable status codes', async (code) => {
    await app.request(`http://localhost/custom/${code}/`)
    const res = await app.request(`http://localhost/custom/${code}/`)
    expect(res).not.toBeNull()
    expect(res.status).toBe(code)
    expect(res.headers.get('cache-control')).not.toBe('max-age=10')
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

describe('Cache Skipping Logic', () => {
  let putSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    putSpy = vi.fn()
    const mockCache = {
      match: vi.fn().mockResolvedValue(undefined), // Always miss
      put: putSpy, // We spy on this
      keys: vi.fn().mockResolvedValue([]),
    }

    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue(mockCache),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should NOT cache response if Cache-Control contains "private"', async () => {
    const app = new Hono()
    app.use('*', cache({ cacheName: 'skip-test', wait: true }))
    app.get('/', (c) => {
      c.header('Cache-Control', 'private, max-age=3600')
      return c.text('response')
    })

    const res = await app.request('/')
    expect(res.status).toBe(200)
    // IMPORTANT: put() should NOT be called
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('Should NOT cache response if Cache-Control contains "no-store"', async () => {
    const app = new Hono()
    app.use('*', cache({ cacheName: 'skip-test', wait: true }))
    app.get('/', (c) => {
      c.header('Cache-Control', 'no-store')
      return c.text('response')
    })

    await app.request('/')
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('Should NOT cache response if Cache-Control contains no-cache="Set-Cookie"', async () => {
    const app = new Hono()
    app.use('*', cache({ cacheName: 'skip-test', wait: true }))
    app.get('/', (c) => {
      c.header('Cache-Control', 'no-cache="Set-Cookie"')
      return c.text('response')
    })

    await app.request('/')
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('Should NOT cache response if Set-Cookie header is present', async () => {
    const app = new Hono()
    app.use('*', cache({ cacheName: 'skip-test', wait: true }))
    app.get('/', (c) => {
      c.header('Set-Cookie', 'session=secret')
      return c.text('response')
    })

    await app.request('/')
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('Should cache normal responses (Control Test)', async () => {
    const app = new Hono()
    app.use('*', cache({ cacheName: 'skip-test', wait: true }))
    app.get('/', (c) => {
      return c.text('response')
    })

    await app.request('/')
    // IMPORTANT: put() SHOULD be called for normal responses
    expect(putSpy).toHaveBeenCalled()
  })
})
