import { getCookie } from '../../helper/cookie'
import { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import type { EventContext } from './handler'
import { handle, handleMiddleware } from './handler'

type Env = {
  Bindings: {
    TOKEN: string
    eventContext: EventContext
  }
}

describe('Adapter for Cloudflare Pages', () => {
  it('Should return 200 response', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const app = new Hono<Env>()
    app.get('/api/foo', (c) => {
      const reqInEventContext = c.env.eventContext.request
      return c.json({ TOKEN: c.env.TOKEN, requestURL: reqInEventContext.url })
    })
    const handler = handle(app)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request, env })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      TOKEN: 'HONOISCOOL',
      requestURL: 'http://localhost/api/foo',
    })
  })

  it('Should not use `basePath()` if path argument is not passed', async () => {
    const request = new Request('http://localhost/api/error')
    const app = new Hono().basePath('/api')

    app.onError((e) => {
      throw e
    })
    app.get('/error', () => {
      throw new Error('Custom Error')
    })

    const handler = handle(app)
    // It does throw the error if app is NOT "subApp"
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => handler({ request })).toThrowError('Custom Error')
  })
})

describe('Middleware adapter for Cloudflare Pages', () => {
  it('Should return the middleware response', async () => {
    const request = new Request('http://localhost/api/foo', {
      headers: {
        Cookie: 'my_cookie=1234',
      },
    })
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware(async (c, next) => {
      const cookie = getCookie(c, 'my_cookie')

      await next()

      return c.json({ cookie, response: await c.res.json() })
    })

    const next = vi.fn().mockResolvedValue(Response.json('From Cloudflare Pages'))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request, env, next })

    expect(next).toHaveBeenCalled()

    expect(await res.json()).toEqual({
      cookie: '1234',
      response: 'From Cloudflare Pages',
    })
  })

  it('Should return the middleware response when exceptions are handled', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware(async (c, next) => {
      await next()

      return c.json({ error: c.error?.message })
    })

    const next = vi.fn().mockRejectedValue(new Error('Error from next()'))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request, env, next })

    expect(next).toHaveBeenCalled()

    expect(await res.json()).toEqual({
      error: 'Error from next()',
    })
  })

  it('Should return the middleware response if next() is not called', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware(async (c) => {
      return c.json({ response: 'Skip Cloudflare Pages' })
    })

    const next = vi.fn()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request, env, next })

    expect(next).not.toHaveBeenCalled()

    expect(await res.json()).toEqual({
      response: 'Skip Cloudflare Pages',
    })
  })

  it('Should return the Pages response if the middleware does not return a response', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware((c, next) => next())

    const next = vi.fn().mockResolvedValue(Response.json('From Cloudflare Pages'))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request, env, next })

    expect(next).toHaveBeenCalled()

    expect(await res.json()).toEqual('From Cloudflare Pages')
  })

  it('Should handle a HTTPException by returning error.getResponse()', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware(() => {
      const res = new Response('Unauthorized', { status: 401 })
      throw new HTTPException(401, { res })
    })

    const next = vi.fn()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request, env, next })

    expect(next).not.toHaveBeenCalled()

    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should handle an HTTPException thrown by next()', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware((c, next) => next())

    const next = vi
      .fn()
      .mockRejectedValue(new HTTPException(401, { res: Response.json('Unauthorized') }))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request, env, next })

    expect(next).toHaveBeenCalled()

    expect(await res.json()).toEqual('Unauthorized')
  })

  it('Should handle an Error thrown by next()', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware((c, next) => next())

    const next = vi.fn().mockRejectedValue(new Error('Error from next()'))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await expect(handler({ request, env, next })).rejects.toThrowError('Error from next()')
    expect(next).toHaveBeenCalled()
  })

  it('Should handle a non-Error thrown by next()', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware((c, next) => next())

    const next = vi.fn().mockRejectedValue('Error from next()')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await expect(handler({ request, env, next })).rejects.toThrowError('Error from next()')
    expect(next).toHaveBeenCalled()
  })

  it('Should rethrow an Error', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware(() => {
      throw new Error('Something went wrong')
    })

    const next = vi.fn()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await expect(handler({ request, env, next })).rejects.toThrowError('Something went wrong')
    expect(next).not.toHaveBeenCalled()
  })

  it('Should rethrow non-Error exceptions', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const handler = handleMiddleware(() => Promise.reject('Something went wrong'))
    const next = vi.fn()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await expect(handler({ request, env, next })).rejects.toThrowError('Something went wrong')
    expect(next).not.toHaveBeenCalled()
  })
})
