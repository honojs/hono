import { Hono } from '../../hono'
import { rateLimiter, MemoryStore } from '.'
import type { RateLimitInfo, RateLimitStore } from '.'

describe('Rate Limiter Middleware', () => {
  describe('basic rate limiting', () => {
    let app: Hono

    beforeEach(() => {
      app = new Hono()
      app.use(rateLimiter({ windowMs: 60_000, limit: 3 }))
      app.get('/', (c) => c.text('OK'))
    })

    it('should allow requests within the limit', async () => {
      for (let i = 0; i < 3; i++) {
        const res = await app.request('http://localhost/')
        expect(res.status).toBe(200)
      }
    })

    it('should block requests that exceed the limit', async () => {
      for (let i = 0; i < 3; i++) {
        await app.request('http://localhost/')
      }
      const res = await app.request('http://localhost/')
      expect(res.status).toBe(429)
    })

    it('should return 429 with correct message when rate limited', async () => {
      for (let i = 0; i < 3; i++) {
        await app.request('http://localhost/')
      }
      const res = await app.request('http://localhost/')
      expect(res.status).toBe(429)
      expect(await res.text()).toBe('Too Many Requests')
    })
  })

  describe('standard rate limit headers', () => {
    let app: Hono

    beforeEach(() => {
      app = new Hono()
      app.use(rateLimiter({ windowMs: 60_000, limit: 5 }))
      app.get('/', (c) => c.text('OK'))
    })

    it('should set RateLimit-Limit header', async () => {
      const res = await app.request('http://localhost/')
      expect(res.headers.get('RateLimit-Limit')).toBe('5')
    })

    it('should set RateLimit-Remaining header and decrement it', async () => {
      const res1 = await app.request('http://localhost/')
      expect(res1.headers.get('RateLimit-Remaining')).toBe('4')

      const res2 = await app.request('http://localhost/')
      expect(res2.headers.get('RateLimit-Remaining')).toBe('3')
    })

    it('should set RateLimit-Reset header as a future unix timestamp (seconds)', async () => {
      const before = Math.floor(Date.now() / 1000)
      const res = await app.request('http://localhost/')
      const after = Math.ceil((Date.now() + 60_000) / 1000)

      const resetHeader = parseInt(res.headers.get('RateLimit-Reset') ?? '0', 10)
      expect(resetHeader).toBeGreaterThanOrEqual(before)
      expect(resetHeader).toBeLessThanOrEqual(after)
    })

    it('should set RateLimit-Policy header when rate limited', async () => {
      for (let i = 0; i < 5; i++) {
        await app.request('http://localhost/')
      }
      const res = await app.request('http://localhost/')
      expect(res.headers.get('RateLimit-Policy')).toBe('5;w=60')
    })

    it('should not set RateLimit-Policy header when not rate limited', async () => {
      const res = await app.request('http://localhost/')
      expect(res.headers.get('RateLimit-Policy')).toBeNull()
    })
  })

  describe('standardHeaders: false', () => {
    it('should not set rate limit headers', async () => {
      const app = new Hono()
      app.use(rateLimiter({ limit: 5, standardHeaders: false }))
      app.get('/', (c) => c.text('OK'))

      const res = await app.request('http://localhost/')
      expect(res.headers.get('RateLimit-Limit')).toBeNull()
      expect(res.headers.get('RateLimit-Remaining')).toBeNull()
      expect(res.headers.get('RateLimit-Reset')).toBeNull()
    })
  })

  describe('custom key generator', () => {
    it('should rate limit each key independently', async () => {
      const app = new Hono()
      app.use(
        rateLimiter({
          limit: 2,
          keyGenerator: (c) => c.req.header('x-user-id') ?? 'anon',
        })
      )
      app.get('/', (c) => c.text('OK'))

      // user A
      await app.request('http://localhost/', { headers: { 'x-user-id': 'userA' } })
      await app.request('http://localhost/', { headers: { 'x-user-id': 'userA' } })
      const resA = await app.request('http://localhost/', { headers: { 'x-user-id': 'userA' } })
      expect(resA.status).toBe(429)

      // user B should still be under their limit
      const resB = await app.request('http://localhost/', { headers: { 'x-user-id': 'userB' } })
      expect(resB.status).toBe(200)
    })
  })

  describe('X-Forwarded-For default key generator', () => {
    it('should use the first IP in X-Forwarded-For', async () => {
      const app = new Hono()
      app.use(rateLimiter({ limit: 1 }))
      app.get('/', (c) => c.text('OK'))

      await app.request('http://localhost/', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      })
      const res = await app.request('http://localhost/', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      })
      expect(res.status).toBe(429)

      // Different IP should still succeed
      const res2 = await app.request('http://localhost/', {
        headers: { 'x-forwarded-for': '9.9.9.9' },
      })
      expect(res2.status).toBe(200)
    })
  })

  describe('custom onError handler', () => {
    it('should invoke custom error handler when rate limited', async () => {
      const app = new Hono()
      app.use(
        rateLimiter({
          limit: 1,
          onError: (c, _next, info) =>
            c.text(`Rate limited, retry after ${info.resets}`, 429),
        })
      )
      app.get('/', (c) => c.text('OK'))

      await app.request('http://localhost/')
      const res = await app.request('http://localhost/')

      expect(res.status).toBe(429)
      const body = await res.text()
      expect(body).toMatch(/^Rate limited, retry after \d+$/)
    })
  })

  describe('rateLimit context variable', () => {
    it('should expose rate limit info via c.get("rateLimit")', async () => {
      let capturedInfo: RateLimitInfo | undefined

      const app = new Hono()
      app.use(rateLimiter({ limit: 5 }))
      app.get('/', (c) => {
        capturedInfo = c.get('rateLimit')
        return c.text('OK')
      })

      await app.request('http://localhost/')
      await app.request('http://localhost/')

      expect(capturedInfo).toBeDefined()
      expect(capturedInfo!.limit).toBe(5)
      expect(capturedInfo!.remaining).toBe(3)
      expect(capturedInfo!.limited).toBe(false)
    })

    it('should mark limited=true when the limit is exceeded', async () => {
      let capturedInfo: RateLimitInfo | undefined

      const app = new Hono()
      app.use(
        rateLimiter({
          limit: 1,
          onError: (c, _next, info) => {
            capturedInfo = info
            return c.text('limited', 429)
          },
        })
      )
      app.get('/', (c) => c.text('OK'))

      await app.request('http://localhost/')
      await app.request('http://localhost/')

      expect(capturedInfo).toBeDefined()
      expect(capturedInfo!.limited).toBe(true)
      expect(capturedInfo!.remaining).toBe(0)
    })
  })

  describe('MemoryStore', () => {
    it('should reset the count after the window expires', async () => {
      const store = new MemoryStore()
      const windowMs = 50 // 50ms

      const { count: c1 } = await store.increment('key', windowMs)
      expect(c1).toBe(1)

      const { count: c2 } = await store.increment('key', windowMs)
      expect(c2).toBe(2)

      // Wait for the window to expire
      await new Promise((resolve) => setTimeout(resolve, windowMs + 10))

      const { count: c3 } = await store.increment('key', windowMs)
      expect(c3).toBe(1) // window reset, count starts fresh
    })
  })

  describe('custom store', () => {
    it('should use the custom store for tracking requests', async () => {
      const calls: string[] = []

      const customStore: RateLimitStore = {
        async increment(key, windowMs) {
          calls.push(key)
          return { count: calls.length, resets: Date.now() + windowMs }
        },
      }

      const app = new Hono()
      app.use(rateLimiter({ limit: 100, store: customStore }))
      app.get('/', (c) => c.text('OK'))

      await app.request('http://localhost/')
      await app.request('http://localhost/')

      expect(calls).toHaveLength(2)
    })
  })

  describe('default options', () => {
    it('should work with no options provided', async () => {
      const app = new Hono()
      app.use(rateLimiter())
      app.get('/', (c) => c.text('OK'))

      const res = await app.request('http://localhost/')
      expect(res.status).toBe(200)
      expect(res.headers.get('RateLimit-Limit')).toBe('10')
    })
  })
})
