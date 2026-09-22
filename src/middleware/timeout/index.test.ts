import type { Context } from '../../context'
import { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import type { HTTPExceptionFunction } from '.'
import { getTimeoutSignal, timeout } from '.'

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

describe('Timeout signal', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('is undefined without timeout middleware', async () => {
    const app = new Hono()
    app.get('/', (c) => {
      expect(getTimeoutSignal(c)).toBeUndefined()
      return c.text('ok')
    })
    expect((await app.request('/')).status).toBe(200)
  })

  it.each(['default', 'object', 'factory'])(
    'cancels work with the %s timeout exception',
    async (kind) => {
      const app = new Hono()
      const error = new HTTPException(408, { message: 'custom timeout' })
      const factory = vi.fn(() => error)
      app.use(timeout(50, kind === 'default' ? undefined : kind === 'object' ? error : factory))
      let signal: AbortSignal | undefined
      const cancelled = vi.fn()
      const onError = vi.fn((err: Error, c: Context) => c.text(err.message, 503))
      app.onError(onError)
      app.get('/', async (c) => {
        signal = getTimeoutSignal(c)!
        expect(signal.aborted).toBe(false)
        expect(getTimeoutSignal(c)).toBe(signal)
        await new Promise<void>((_, reject) => {
          const timer = setTimeout(() => reject(new Error('work was not cancelled')), 500)
          signal!.addEventListener(
            'abort',
            () => {
              clearTimeout(timer)
              cancelled()
              reject(signal!.reason)
            },
            { once: true }
          )
        })
        return c.text('unreachable')
      })
      const response = app.request('/')
      await vi.advanceTimersByTimeAsync(50)
      expect((await response).status).toBe(503)
      expect(cancelled).toHaveBeenCalledOnce()
      expect(signal!.aborted).toBe(true)
      expect(signal!.reason).toBeInstanceOf(HTTPException)
      expect(signal!.reason.status).toBe(kind === 'default' ? 504 : 408)
      expect(onError.mock.calls.every(([err]) => err === signal!.reason)).toBe(true)
      if (kind !== 'default') {
        expect(signal!.reason).toBe(error)
      }
      expect(factory).toHaveBeenCalledTimes(kind === 'factory' ? 1 : 0)
      expect(vi.getTimerCount()).toBe(0)
    }
  )

  it.each([
    [50, 100],
    [100, 50],
  ])('shares cancellation for nested durations %i and %i', async (outer, inner) => {
    const app = new Hono()
    let outerSignal: AbortSignal | undefined
    let innerSignal: AbortSignal | undefined
    const outerError = new HTTPException(408)
    const innerError = new HTTPException(504)
    app.use(timeout(outer, outerError))
    app.use(async (c, next) => {
      outerSignal = getTimeoutSignal(c)
      await next()
    })
    app.use(timeout(inner, innerError))
    app.get('/', async (c) => {
      innerSignal = getTimeoutSignal(c)
      await new Promise((resolve) => setTimeout(resolve, 200))
      return c.text('late')
    })
    const response = app.request('/')
    await vi.advanceTimersByTimeAsync(50)
    expect((await response).status).toBe(outer < inner ? 408 : 504)
    expect(innerSignal).toBe(outerSignal)
    expect(innerSignal!.reason).toBe(outer < inner ? outerError : innerError)
    await vi.runAllTimersAsync()
    expect(innerSignal!.reason).toBe(outer < inner ? outerError : innerError)
  })

  it('clears an inner timer while an outer timeout remains active', async () => {
    const app = new Hono()
    let signal: AbortSignal | undefined
    app.use(timeout(100))
    app.use(async (_, next) => {
      await next()
      await new Promise((resolve) => setTimeout(resolve, 75))
    })
    app.use(timeout(50))
    app.get('/', (c) => {
      signal = getTimeoutSignal(c)
      return c.text('ok')
    })
    const response = app.request('/')
    await vi.advanceTimersByTimeAsync(75)
    expect((await response).status).toBe(200)
    expect(signal!.aborted).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(100)
    expect(signal!.aborted).toBe(false)
  })

  it('clears the timer without aborting a successful streaming response', async () => {
    const app = new Hono()
    let signal: AbortSignal | undefined
    app.use(timeout(50))
    app.get('/', (c) => {
      signal = getTimeoutSignal(c)!
      return new Response(
        new ReadableStream({
          start(controller) {
            signal!.addEventListener('abort', () => controller.error(signal!.reason), {
              once: true,
            })
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode('body'))
              controller.close()
            }, 100)
          },
        })
      )
    })
    const response = await app.request('/')
    const body = response.text()
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(100)
    expect(await body).toBe('body')
    expect(signal!.aborted).toBe(false)
  })

  it('clears the timer after a downstream error without aborting', async () => {
    const app = new Hono()
    let signal: AbortSignal | undefined
    app.use(timeout(50))
    app.get('/', (c) => {
      signal = getTimeoutSignal(c)
      throw new HTTPException(400)
    })
    expect((await app.request('/')).status).toBe(400)
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(100)
    expect(signal!.aborted).toBe(false)
  })

  it.each([false, true])(
    'allows composing an incoming signal, already aborted: %s',
    async (alreadyAborted) => {
      const app = new Hono()
      const incoming = new AbortController()
      const reason = new Error('disconnected')
      if (alreadyAborted) {
        incoming.abort(reason)
      }
      app.use(timeout(50))
      app.get('/', (c) => {
        const signal = getTimeoutSignal(c)!
        const combined = AbortSignal.any([signal, c.req.raw.signal])
        incoming.abort(reason)
        expect(combined.aborted).toBe(true)
        expect(combined.reason).toBe(reason)
        expect(signal.aborted).toBe(false)
        return c.text('ok')
      })
      expect((await app.request('/', { signal: incoming.signal })).status).toBe(200)
      expect(vi.getTimerCount()).toBe(0)
    }
  )

  it('isolates concurrent requests and leaves the incoming signal unchanged on timeout', async () => {
    const app = new Hono()
    const signals: AbortSignal[] = []
    const incoming = new AbortController()
    app.use(timeout(50))
    app.get('/:speed', async (c) => {
      signals.push(getTimeoutSignal(c)!)
      if (c.req.param('speed') === 'slow') {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      return c.text('ok')
    })
    const slow = app.request('/slow', { signal: incoming.signal })
    expect((await app.request('/fast')).status).toBe(200)
    await vi.advanceTimersByTimeAsync(50)
    expect((await slow).status).toBe(504)
    expect(signals[0]).not.toBe(signals[1])
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    expect(incoming.signal.aborted).toBe(false)
    await vi.runAllTimersAsync()
  })
})
