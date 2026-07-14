import { vi } from 'vitest'
import type { ExecutionContext } from '../../context'
import { Hono } from '../../hono'
import { cache } from '.'

// Mock
type StoreMap = Map<string | Request, Response>

class MockCache {
  name: string
  store: StoreMap

  constructor(name: string, store: StoreMap) {
    this.name = name
    this.store = store
  }

  async match(key: Request | string): Promise<Response | null> {
    return this.store.get(key) || null
  }

  async keys() {
    return this.store.keys()
  }

  async put(key: Request | string, response: Response): Promise<void> {
    this.store.set(key, response)
  }
}

const globalStore: StoreMap = new Map()

vi.stubGlobal('caches', {
  open: (name: string) => {
    return new MockCache(name, globalStore)
  },
})

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

  app.use('/wait5/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))
  app.get('/wait5/', (c) => {
    c.header('Cache-Control', 'Max-Age=3600')
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

  it('Should not duplicate a Cache-Control directive that differs only in case', async () => {
    const res = await app.request('/wait5/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    // Directive names are case-insensitive (RFC 7234 §5.2); the handler's
    // `Max-Age` must suppress the middleware's configured `max-age`.
    expect(res.headers.get('cache-control')).toBe('Max-Age=3600')
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

  it('Should call onCacheNotAvailable when caches is not defined', async () => {
    vi.stubGlobal('caches', undefined)
    const spy = vi.fn()
    const app = new Hono()
    app.use(cache({ cacheName: 'my-app-v1', onCacheNotAvailable: spy }))
    app.get('/', (c) => {
      return c.text('cached')
    })
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(spy).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('Should suppress default log when onCacheNotAvailable is false', async () => {
    vi.stubGlobal('caches', undefined)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const app = new Hono()
    app.use(cache({ cacheName: 'my-app-v1', onCacheNotAvailable: false }))
    app.get('/', (c) => {
      return c.text('cached')
    })
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(logSpy).not.toHaveBeenCalledWith(
      'Cache Middleware is not enabled because caches is not defined.'
    )
    logSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})

describe('Cache Skipping Logic', () => {
  const stubStoreBackedCache = () => {
    const store = new Map<string | Request, Response>()
    const mockCache = {
      match: vi.fn((key: string | Request) => Promise.resolve(store.get(key)?.clone())),
      put: vi.fn((key: string | Request, response: Response) => {
        store.set(key, response.clone())
        return Promise.resolve()
      }),
      keys: vi.fn(() => Promise.resolve(Array.from(store.keys()))),
    }

    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue(mockCache),
    })

    return { mockCache }
  }

  let putSpy: ReturnType<typeof vi.fn>
  let matchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    matchSpy = vi.fn().mockResolvedValue(undefined)
    putSpy = vi.fn()
    const mockCache = {
      match: matchSpy, // Always miss unless a test overrides it
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

  it.each(['Accept-Language', 'Authorization', 'X-Tenant'])(
    'Should NOT cache response if Vary: %s is set',
    async (vary) => {
      const app = new Hono()
      app.use('*', cache({ cacheName: 'skip-test', wait: true }))
      app.get('/', (c) => {
        c.header('Vary', vary)
        return c.text('response')
      })

      await app.request('/')
      expect(putSpy).not.toHaveBeenCalled()
    }
  )

  it('Should set configured Vary header and cache by the configured request header value', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    let count = 0
    app.use('*', cache({ cacheName: 'skip-test', wait: true, vary: 'Accept' }))
    app.get('/', (c) => {
      count++
      c.header('X-Count', `${count}`)
      return c.text('response')
    })

    await app.request('/')
    const res = await app.request('/')
    expect(res.headers.get('Vary')).toBe('accept')
    expect(res.headers.get('X-Count')).toBe('1')
    expect(mockCache.put).toHaveBeenCalledOnce()
  })

  it('Should store separate variants for different Accept-Language request values', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    let count = 0
    app.use('*', cache({ cacheName: 'vary-language-test', wait: true, vary: 'Accept-Language' }))
    app.get('/', (c) => {
      count++
      c.header('X-Count', `${count}`)
      return c.text(c.req.header('Accept-Language') ?? 'missing')
    })

    await app.request('/', {
      headers: {
        'Accept-Language': 'en',
      },
    })
    const en = await app.request('/', {
      headers: {
        'Accept-Language': 'en',
      },
    })
    await app.request('/', {
      headers: {
        'Accept-Language': 'ja',
      },
    })
    const ja = await app.request('/', {
      headers: {
        'Accept-Language': 'ja',
      },
    })

    expect(await en.text()).toBe('en')
    expect(en.headers.get('X-Count')).toBe('1')
    expect(await ja.text()).toBe('ja')
    expect(ja.headers.get('X-Count')).toBe('2')
    expect(mockCache.put).toHaveBeenCalledTimes(2)
  })

  it('Should keep missing and present Vary request header values in separate variants', async () => {
    stubStoreBackedCache()
    const app = new Hono()
    let count = 0
    app.use('*', cache({ cacheName: 'vary-missing-test', wait: true, vary: 'Accept-Language' }))
    app.get('/', (c) => {
      count++
      c.header('X-Count', `${count}`)
      return c.text(c.req.header('Accept-Language') ?? 'missing')
    })

    await app.request('/')
    await app.request('/', {
      headers: {
        'Accept-Language': 'en',
      },
    })
    const missing = await app.request('/')
    const present = await app.request('/', {
      headers: {
        'Accept-Language': 'en',
      },
    })

    expect(await missing.text()).toBe('missing')
    expect(missing.headers.get('X-Count')).toBe('1')
    expect(await present.text()).toBe('en')
    expect(present.headers.get('X-Count')).toBe('2')
  })

  it('Should store separate variants using multiple configured request headers', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    let count = 0
    app.use(
      '*',
      cache({ cacheName: 'vary-multiple-test', wait: true, vary: ['Accept', 'Accept-Encoding'] })
    )
    app.get('/', (c) => {
      count++
      c.header('X-Count', `${count}`)
      return c.text(`${c.req.header('Accept')}:${c.req.header('Accept-Encoding')}`)
    })

    await app.request('/', {
      headers: {
        Accept: 'text/plain',
        'Accept-Encoding': 'gzip',
      },
    })
    const same = await app.request('/', {
      headers: {
        Accept: 'text/plain',
        'Accept-Encoding': 'gzip',
      },
    })
    await app.request('/', {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
      },
    })
    const differentAccept = await app.request('/', {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
      },
    })
    await app.request('/', {
      headers: {
        Accept: 'text/plain',
        'Accept-Encoding': 'br',
      },
    })
    const differentEncoding = await app.request('/', {
      headers: {
        Accept: 'text/plain',
        'Accept-Encoding': 'br',
      },
    })

    expect(same.headers.get('X-Count')).toBe('1')
    expect(differentAccept.headers.get('X-Count')).toBe('2')
    expect(differentEncoding.headers.get('X-Count')).toBe('3')
    expect(mockCache.put).toHaveBeenCalledTimes(3)
  })

  it('Should store when the handler Vary header is covered by configured Vary headers', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    app.use('*', cache({ cacheName: 'vary-covered-test', wait: true, vary: 'Accept-Language' }))
    app.get('/', (c) => {
      c.header('Vary', 'Accept-Language')
      return c.text('response')
    })

    await app.request('/')
    expect(mockCache.put).toHaveBeenCalledOnce()
  })

  it('Should not store when the handler adds Vary headers not covered by configured Vary headers', async () => {
    const app = new Hono()
    app.use('*', cache({ cacheName: 'skip-test', wait: true, vary: 'Accept-Language' }))
    app.get('/', (c) => {
      c.header('Vary', 'Accept-Language, Cookie')
      return c.text('response')
    })

    await app.request('/')
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('Should not store Vary: * responses even when Vary headers are configured', async () => {
    const app = new Hono()
    app.use('*', cache({ cacheName: 'skip-test', wait: true, vary: 'Accept-Language' }))
    app.get('/', (c) => {
      c.header('Vary', '*')
      return c.text('response')
    })

    await app.request('/')
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('Should bypass cache for Authorization requests', async () => {
    const app = new Hono()
    app.use('*', cache({ cacheName: 'skip-test', wait: true, cacheControl: 'max-age=10' }))
    app.get('/', (c) => {
      return c.text('fresh')
    })

    const res = await app.request('/', {
      headers: {
        Authorization: 'Bearer token',
      },
    })
    expect(await res.text()).toBe('fresh')
    expect(caches.open).not.toHaveBeenCalled()
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('Should cache QUERY responses without consuming the handler request body', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    let queryCount = 0
    app.use('*', cache({ cacheName: 'query-test', wait: true, cacheControl: 'max-age=10' }))
    app.on('QUERY', '/resource', async (c) => {
      queryCount++
      c.header('X-Count', `${queryCount}`)
      return c.text(await c.req.raw.text())
    })

    const request = () =>
      app.request('/resource', {
        method: 'QUERY',
        headers: { 'Content-Type': 'application/json' },
        body: '{"query":"hono"}',
      })

    await request()
    const res = await request()

    expect(await res.text()).toBe('{"query":"hono"}')
    expect(res.headers.get('X-Count')).toBe('1')
    expect(res.headers.get('Cache-Control')).toBe('max-age=10')
    expect(mockCache.put).toHaveBeenCalledOnce()
  })

  it('Should bypass QUERY caching when the measured body exceeds the configured limit', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    let queryCount = 0
    app.use('*', cache({ cacheName: 'query-body-limit-test', wait: true, maxQueryBodySize: 4 }))
    app.on('QUERY', '/resource', async (c) => {
      queryCount++
      c.header('X-Count', `${queryCount}`)
      return c.text(await c.req.text())
    })

    const request = () => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('ab'))
          controller.enqueue(new TextEncoder().encode('cde'))
          controller.close()
        },
      })
      return app.request('/resource', {
        method: 'QUERY',
        headers: {
          'Content-Length': '1',
          'Content-Type': 'text/plain',
        },
        body,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' })
    }

    await request()
    const res = await request()

    expect(await res.text()).toBe('abcde')
    expect(res.headers.get('X-Count')).toBe('2')
    expect(caches.open).not.toHaveBeenCalled()
    expect(mockCache.put).not.toHaveBeenCalled()
  })

  it('Should cache QUERY requests at the configured body size limit', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    let queryCount = 0
    app.use(
      '*',
      cache({ cacheName: 'query-body-limit-boundary-test', wait: true, maxQueryBodySize: 4 })
    )
    app.on('QUERY', '/resource', async (c) => {
      queryCount++
      c.header('X-Count', `${queryCount}`)
      return c.text(await c.req.text())
    })

    const request = () =>
      app.request('/resource', {
        method: 'QUERY',
        headers: { 'Content-Type': 'text/plain' },
        body: 'abcd',
      })

    await request()
    const res = await request()

    expect(await res.text()).toBe('abcd')
    expect(res.headers.get('X-Count')).toBe('1')
    expect(mockCache.put).toHaveBeenCalledOnce()
  })

  it('Should keep QUERY request content and Content-Type in separate cache variants', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    let queryCount = 0
    app.use(
      '*',
      cache({ cacheName: 'query-variant-test', wait: true, keyGenerator: () => 'query-key' })
    )
    app.on('QUERY', '/resource', async (c) => {
      queryCount++
      c.header('X-Count', `${queryCount}`)
      return c.text(`${c.req.header('Content-Type')}:${await c.req.text()}`)
    })

    const request = (body: string, contentType: string) =>
      app.request('/resource', {
        method: 'QUERY',
        headers: { 'Content-Type': contentType },
        body,
      })

    await request('one', 'text/plain')
    const same = await request('one', 'text/plain')
    await request('two', 'text/plain')
    const differentContent = await request('two', 'text/plain')
    await request('one', 'application/json')
    const differentContentType = await request('one', 'application/json')

    expect(same.headers.get('X-Count')).toBe('1')
    expect(differentContent.headers.get('X-Count')).toBe('2')
    expect(differentContentType.headers.get('X-Count')).toBe('3')
    expect(mockCache.put).toHaveBeenCalledTimes(3)
  })

  it('Should keep GET and QUERY responses in separate cache entries', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    app.use('*', cache({ cacheName: 'method-test', wait: true }))
    app.get('/resource', (c) => c.text('get response'))
    app.on('QUERY', '/resource', (c) => c.text('query response'))

    await app.request('/resource')
    await app.request('/resource', {
      method: 'QUERY',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    const getRes = await app.request('/resource')
    const queryRes = await app.request('/resource', {
      method: 'QUERY',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })

    expect(await getRes.text()).toBe('get response')
    expect(await queryRes.text()).toBe('query response')
    expect(mockCache.put).toHaveBeenCalledTimes(2)
  })

  it('Should bypass QUERY caching when Web Crypto is not available', async () => {
    const originalCrypto = globalThis.crypto
    vi.stubGlobal('crypto', undefined)

    try {
      const app = new Hono()
      let queryCount = 0
      app.use('*', cache({ cacheName: 'query-no-crypto-test', wait: true }))
      app.on('QUERY', '/resource', (c) => {
        queryCount++
        c.header('X-Count', `${queryCount}`)
        return c.text('query response')
      })

      const request = () =>
        app.request('/resource', {
          method: 'QUERY',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })

      await request()
      const res = await request()

      expect(res.headers.get('X-Count')).toBe('2')
      expect(caches.open).not.toHaveBeenCalled()
    } finally {
      vi.stubGlobal('crypto', originalCrypto)
    }
  })

  it('Should bypass QUERY caching when the request content cannot be read', async () => {
    const app = new Hono()
    let queryCount = 0
    app.use('*', async (c, next) => {
      await c.req.raw.text()
      await next()
    })
    app.use('*', cache({ cacheName: 'query-consumed-body-test', wait: true }))
    app.on('QUERY', '/resource', (c) => {
      queryCount++
      c.header('X-Count', `${queryCount}`)
      return c.text('query response')
    })

    const request = () =>
      app.request('/resource', {
        method: 'QUERY',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })

    await request()
    const res = await request()

    expect(res.headers.get('X-Count')).toBe('2')
    expect(caches.open).not.toHaveBeenCalled()
  })

  it('Should bypass QUERY caching after the body was read directly as FormData', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    let queryCount = 0
    app.use('*', async (c, next) => {
      expect((await c.req.formData()).get('query')).toBe('hono')
      await next()
    })
    app.use('*', cache({ cacheName: 'query-cached-form-data-test', wait: true }))
    app.on('QUERY', '/resource', (c) => {
      queryCount++
      c.header('X-Count', `${queryCount}`)
      return c.text('query response')
    })

    const body = [
      '--hono-boundary',
      'Content-Disposition: form-data; name="query"',
      '',
      'hono',
      '--hono-boundary--',
      '',
    ].join('\r\n')
    const request = () =>
      app.request('/resource', {
        method: 'QUERY',
        headers: { 'Content-Type': 'multipart/form-data; boundary=hono-boundary' },
        body,
      })

    await request()
    const res = await request()

    expect(res.headers.get('X-Count')).toBe('2')
    expect(caches.open).not.toHaveBeenCalled()
    expect(mockCache.put).not.toHaveBeenCalled()
  })

  it('Should cache QUERY after the body was read through HonoRequest', async () => {
    const { mockCache } = stubStoreBackedCache()
    const app = new Hono()
    let queryCount = 0
    app.use('*', async (c, next) => {
      expect(await c.req.text()).toBe('{}')
      await next()
    })
    app.use('*', cache({ cacheName: 'query-cached-body-test', wait: true }))
    app.on('QUERY', '/resource', async (c) => {
      queryCount++
      c.header('X-Count', `${queryCount}`)
      return c.text(await c.req.text())
    })

    const request = () =>
      app.request('/resource', {
        method: 'QUERY',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })

    await request()
    const res = await request()

    expect(await res.text()).toBe('{}')
    expect(res.headers.get('X-Count')).toBe('1')
    expect(mockCache.put).toHaveBeenCalledOnce()
  })

  it('Should not use or store cache for POST requests', async () => {
    const app = new Hono()
    let postCount = 0
    app.use('*', cache({ cacheName: 'skip-test', wait: true, cacheControl: 'max-age=10' }))
    app.get('/resource', (c) => {
      return c.text('get response')
    })
    app.post('/resource', (c) => {
      postCount++
      c.header('X-Count', `${postCount}`)
      return c.text('post response')
    })

    await app.request('/resource')
    putSpy.mockClear()
    matchSpy.mockClear()

    await app.request('/resource', { method: 'POST' })
    const res = await app.request('/resource', { method: 'POST' })
    expect(res.headers.get('X-Count')).toBe('2')
    expect(res.headers.get('Cache-Control')).toBeNull()
    expect(matchSpy).not.toHaveBeenCalled()
    expect(putSpy).not.toHaveBeenCalled()
  })
})
