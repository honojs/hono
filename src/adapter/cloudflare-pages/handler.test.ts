import { getCookie } from '../../helper/cookie'
import { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import type { EventContext } from './handler'
import { handle, handleMiddleware, serveStatic } from './handler'

type Env = {
  Bindings: {
    TOKEN: string
  }
}

function createEventContext(
  context: Partial<EventContext<Env['Bindings']>>
): EventContext<Env['Bindings']> {
  return {
    data: {},
    env: {
      ...context.env,
      ASSETS: { fetch: vi.fn(), ...context.env?.ASSETS },
      TOKEN: context.env?.TOKEN ?? 'HONOISHOT',
    },
    functionPath: '_worker.js',
    next: vi.fn(),
    params: {},
    passThroughOnException: vi.fn(),
    props: {},
    request: new Request('http://localhost/api/foo'),
    waitUntil: vi.fn(),
    ...context,
  }
}

describe('Adapter for Cloudflare Pages', () => {
  it('Should return 200 response', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      ASSETS: { fetch },
      TOKEN: 'HONOISHOT',
    }
    const waitUntil = vi.fn()
    const passThroughOnException = vi.fn()
    const props = {}
    const eventContext = createEventContext({
      request,
      env,
      waitUntil,
      passThroughOnException,
    })
    const app = new Hono<Env>()
    const appFetchSpy = vi.spyOn(app, 'fetch')
    app.get('/api/foo', (c) => {
      return c.json({ TOKEN: c.env.TOKEN, requestURL: c.req.url })
    })
    const handler = handle(app)
    const res = await handler(eventContext)
    expect(appFetchSpy).toHaveBeenCalledWith(
      request,
      { ...env, eventContext },
      { waitUntil, passThroughOnException, props }
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      TOKEN: 'HONOISHOT',
      requestURL: 'http://localhost/api/foo',
    })
  })

  it('Should not use `basePath()` if path argument is not passed', async () => {
    const request = new Request('http://localhost/api/error')
    const eventContext = createEventContext({ request })
    const app = new Hono().basePath('/api')

    app.onError((e) => {
      throw e
    })
    app.get('/error', () => {
      throw new Error('Custom Error')
    })

    const handler = handle(app)
    // It does throw the error if app is NOT "subApp"
    expect(() => handler(eventContext)).toThrowError('Custom Error')
  })
})

describe('Middleware adapter for Cloudflare Pages', () => {
  it('Should return the middleware response', async () => {
    const request = new Request('http://localhost/api/foo', {
      headers: {
        Cookie: 'my_cookie=1234',
      },
    })
    const next = vi.fn().mockResolvedValue(Response.json('From Cloudflare Pages'))
    const eventContext = createEventContext({ request, next })
    const handler = handleMiddleware(async (c, next) => {
      const cookie = getCookie(c, 'my_cookie')

      await next()

      return c.json({ cookie, response: await c.res.json() })
    })

    const res = await handler(eventContext)

    expect(next).toHaveBeenCalled()

    expect(await res.json()).toEqual({
      cookie: '1234',
      response: 'From Cloudflare Pages',
    })
  })

  it('Should return the middleware response when exceptions are handled', async () => {
    const request = new Request('http://localhost/api/foo')
    const handler = handleMiddleware(async (c, next) => {
      await next()

      return c.json({ error: c.error?.message })
    })

    const next = vi.fn().mockRejectedValue(new Error('Error from next()'))
    const eventContext = createEventContext({ request, next })
    const res = await handler(eventContext)

    expect(next).toHaveBeenCalled()

    expect(await res.json()).toEqual({
      error: 'Error from next()',
    })
  })

  it('Should return the middleware response if next() is not called', async () => {
    const request = new Request('http://localhost/api/foo')
    const handler = handleMiddleware(async (c) => {
      return c.json({ response: 'Skip Cloudflare Pages' })
    })

    const next = vi.fn()
    const eventContext = createEventContext({ request, next })
    const res = await handler(eventContext)

    expect(next).not.toHaveBeenCalled()

    expect(await res.json()).toEqual({
      response: 'Skip Cloudflare Pages',
    })
  })

  it('Should return the Pages response if the middleware does not return a response', async () => {
    const request = new Request('http://localhost/api/foo')
    const handler = handleMiddleware((c, next) => next())

    const next = vi.fn().mockResolvedValue(Response.json('From Cloudflare Pages'))
    const eventContext = createEventContext({ request, next })
    const res = await handler(eventContext)

    expect(next).toHaveBeenCalled()

    expect(await res.json()).toEqual('From Cloudflare Pages')
  })

  it('Should handle a HTTPException by returning error.getResponse()', async () => {
    const request = new Request('http://localhost/api/foo')
    const handler = handleMiddleware(() => {
      const res = new Response('Unauthorized', { status: 401 })
      throw new HTTPException(401, { res })
    })

    const next = vi.fn()
    const eventContext = createEventContext({ request, next })
    const res = await handler(eventContext)

    expect(next).not.toHaveBeenCalled()

    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should handle an HTTPException thrown by next()', async () => {
    const request = new Request('http://localhost/api/foo')
    const handler = handleMiddleware((c, next) => next())

    const next = vi
      .fn()
      .mockRejectedValue(new HTTPException(401, { res: Response.json('Unauthorized') }))
    const eventContext = createEventContext({ request, next })
    const res = await handler(eventContext)

    expect(next).toHaveBeenCalled()

    expect(await res.json()).toEqual('Unauthorized')
  })

  it('Should handle an Error thrown by next()', async () => {
    const request = new Request('http://localhost/api/foo')
    const handler = handleMiddleware((c, next) => next())

    const next = vi.fn().mockRejectedValue(new Error('Error from next()'))
    const eventContext = createEventContext({ request, next })
    await expect(handler(eventContext)).rejects.toThrowError('Error from next()')
    expect(next).toHaveBeenCalled()
  })

  it('Should handle a non-Error thrown by next()', async () => {
    const request = new Request('http://localhost/api/foo')
    const handler = handleMiddleware((c, next) => next())

    const next = vi.fn().mockRejectedValue('Error from next()')
    const eventContext = createEventContext({ request, next })
    await expect(handler(eventContext)).rejects.toThrowError('Error from next()')
    expect(next).toHaveBeenCalled()
  })

  it('Should rethrow an Error', async () => {
    const request = new Request('http://localhost/api/foo')
    const handler = handleMiddleware(() => {
      throw new Error('Something went wrong')
    })

    const next = vi.fn()
    const eventContext = createEventContext({ request, next })
    await expect(handler(eventContext)).rejects.toThrowError('Something went wrong')
    expect(next).not.toHaveBeenCalled()
  })

  it('Should rethrow non-Error exceptions', async () => {
    const request = new Request('http://localhost/api/foo')
    const handler = handleMiddleware(() => Promise.reject('Something went wrong'))
    const next = vi.fn()
    const eventContext = createEventContext({ request, next })
    await expect(handler(eventContext)).rejects.toThrowError('Something went wrong')
    expect(next).not.toHaveBeenCalled()
  })

  it('Should set the data in eventContext.data', async () => {
    const next = vi.fn()
    const eventContext = createEventContext({ next })
    const handler = handleMiddleware(async (c, next) => {
      c.env.eventContext.data.user = 'Joe'
      await next()
    })
    expect(eventContext.data.user).toBeUndefined()
    await handler(eventContext)
    expect(eventContext.data.user).toBe('Joe')
  })
})

describe('serveStatic()', () => {
  it('Should pass the raw request to ASSETS.fetch', async () => {
    const assetsFetch = vi.fn().mockResolvedValue(new Response('foo.png'))
    const request = new Request('http://localhost/foo.png')
    const env = {
      ASSETS: { fetch: assetsFetch },
      TOKEN: 'HONOISHOT',
    }

    const eventContext = createEventContext({ request, env })
    const app = new Hono<Env>()
    app.use(serveStatic())
    const handler = handle(app)
    const res = await handler(eventContext)

    expect(assetsFetch).toHaveBeenCalledWith(request)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('foo.png')
  })

  it('Should respond with 404 if ASSETS.fetch returns a 404 response', async () => {
    const assetsFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    const request = new Request('http://localhost/foo.png')
    const env = {
      ASSETS: { fetch: assetsFetch },
      TOKEN: 'HONOISHOT',
    }

    const eventContext = createEventContext({ request, env })
    const app = new Hono<Env>()
    app.use(serveStatic())
    const handler = handle(app)
    const res = await handler(eventContext)

    expect(assetsFetch).toHaveBeenCalledWith(request)
    expect(res.status).toBe(404)
  })
})
