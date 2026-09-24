import { Context } from '../../context'
import { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import type { HTTPExceptionFunction } from '.'
import { getTimeoutRemainingTime, timeout } from '.'

describe('Timeout API', () => {
  const app = new Hono()

  app.use('/slow-endpoint', timeout(1000))
  app.use(
    '/slow-endpoint/custom',
    timeout(
      1100,
      () => new HTTPException(408, { message: 'Request timeout. Please try again later.' })
    )
  )
  const exception500: HTTPExceptionFunction = (context: Context) =>
    new HTTPException(500, { message: `Internal Server Error at ${context.req.path}` })
  app.use('/slow-endpoint/error', timeout(1200, exception500))
  app.use('/normal-endpoint', timeout(1000))

  app.get('/slow-endpoint', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    return c.text('This should not show up')
  })

  app.get('/slow-endpoint/custom', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    return c.text('This should not show up')
  })

  app.get('/slow-endpoint/error', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1300))
    return c.text('This should not show up')
  })

  app.get('/normal-endpoint', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 900))
    return c.text('This should not show up')
  })

  it('Should trigger default timeout exception', async () => {
    const res = await app.request('http://localhost/slow-endpoint')
    expect(res).not.toBeNull()
    expect(res.status).toBe(504)
    expect(await res.text()).toContain('Gateway Timeout')
  })

  it('Should apply custom exception with function', async () => {
    const res = await app.request('http://localhost/slow-endpoint/custom')
    expect(res).not.toBeNull()
    expect(res.status).toBe(408)
    expect(await res.text()).toContain('Request timeout. Please try again later.')
  })

  it('Error timeout with custom status code and message', async () => {
    const res = await app.request('http://localhost/slow-endpoint/error')
    expect(res).not.toBeNull()
    expect(res.status).toBe(500)
    expect(await res.text()).toContain('Internal Server Error at /slow-endpoint/error')
  })

  it('No Timeout should pass', async () => {
    const res = await app.request('http://localhost/normal-endpoint')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('This should not show up')
  })
})

describe('Remaining timeout duration', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const createContext = () => new Context(new Request('http://localhost/'))

  it('returns undefined without timeout middleware', () => {
    const c = createContext()
    expect(getTimeoutRemainingTime(c)).toBeUndefined()
    expectTypeOf(getTimeoutRemainingTime(c)).toEqualTypeOf<number | undefined>()
    expectTypeOf(c.get('timeoutDeadline')).toEqualTypeOf<number | undefined>()
  })

  it('counts down between operations and clears the deadline on completion', async () => {
    const c = createContext()
    await timeout(60_000)(c, async () => {
      expect(c.get('timeoutDeadline')).toBe(performance.now() + 60_000)
      expect(getTimeoutRemainingTime(c)).toBe(60_000)
      await vi.advanceTimersByTimeAsync(750)
      expect(getTimeoutRemainingTime(c)).toBe(59_250)
      await vi.advanceTimersByTimeAsync(250)
      expect(getTimeoutRemainingTime(c)).toBe(59_000)
    })
    expect(getTimeoutRemainingTime(c)).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([50, 200])('uses the earliest deadline with a nested %i ms timeout', async (inner) => {
    const c = createContext()
    await timeout(100)(c, async () => {
      await vi.advanceTimersByTimeAsync(20)
      await timeout(inner)(c, async () => {
        expect(getTimeoutRemainingTime(c)).toBe(Math.min(80, inner))
        await vi.advanceTimersByTimeAsync(10)
        expect(getTimeoutRemainingTime(c)).toBe(Math.min(80, inner) - 10)
      })
      expect(getTimeoutRemainingTime(c)).toBe(70)
    })
    expect(getTimeoutRemainingTime(c)).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([50, 200])('retains an expired deadline with a nested %i ms timeout', async (inner) => {
    const app = new Hono()
    let context: Context | undefined
    const observations: (number | undefined)[] = []
    app.use(timeout(100), timeout(inner))
    app.onError((err, c) => {
      observations.push(getTimeoutRemainingTime(c))
      return c.text(err.message, 504)
    })
    app.get('/', async (c) => {
      context = c
      await new Promise((resolve) => setTimeout(resolve, 300))
      observations.push(getTimeoutRemainingTime(c))
      return c.text('Too late')
    })

    const response = app.request('/')
    await vi.advanceTimersByTimeAsync(Math.min(100, inner))
    expect((await response).status).toBe(504)
    expect(getTimeoutRemainingTime(context!)).toBe(0)
    await vi.advanceTimersByTimeAsync(300)
    expect(observations.length).toBeGreaterThanOrEqual(2)
    expect(observations.every((remaining) => remaining === 0)).toBe(true)
    expect(getTimeoutRemainingTime(context!)).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('exposes zero to a custom timeout exception', async () => {
    const c = createContext()
    const exception = new HTTPException(408)
    const result = timeout(10, (context) => {
      expect(getTimeoutRemainingTime(context)).toBe(0)
      return exception
    })(c, async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    const rejection = expect(result).rejects.toBe(exception)
    await vi.advanceTimersByTimeAsync(20)
    await rejection
    expect(getTimeoutRemainingTime(c)).toBe(0)
  })

  it('restores the enclosing deadline after a downstream error', async () => {
    const c = createContext()
    const error = new Error('Downstream failed')
    await timeout(100)(c, async () => {
      await expect(
        timeout(50)(c, async () => {
          throw error
        })
      ).rejects.toBe(error)
      expect(getTimeoutRemainingTime(c)).toBe(100)
    })
    expect(getTimeoutRemainingTime(c)).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports zero when the timer fires before the clock reaches the deadline', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(0)
    const c = createContext()
    const result = timeout(10)(c, async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    const rejection = expect(result).rejects.toBeInstanceOf(HTTPException)
    await vi.advanceTimersByTimeAsync(20)
    await rejection
    expect(getTimeoutRemainingTime(c)).toBe(0)
  })

  it('keeps concurrent request deadlines separate', async () => {
    const first = createContext()
    const second = createContext()
    await timeout(100)(first, async () => {
      await timeout(200)(second, async () => {
        await vi.advanceTimersByTimeAsync(25)
        expect(getTimeoutRemainingTime(first)).toBe(75)
        expect(getTimeoutRemainingTime(second)).toBe(175)
      })
      expect(getTimeoutRemainingTime(second)).toBeUndefined()
      expect(getTimeoutRemainingTime(first)).toBe(75)
    })
    expect(getTimeoutRemainingTime(first)).toBeUndefined()
  })
})
