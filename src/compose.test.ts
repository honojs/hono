import { compose } from './compose'
import { Context } from './context'
import { HonoRequest } from './request'
import type { Params } from './router'

type C = {
  req: Record<string, string>
  res: Record<string, string>
  finalized: boolean
}

type MiddlewareTuple = [[Function, unknown], Params]

class ExpectedError extends Error {}

function buildMiddlewareTuple(fn: Function, params?: Params): MiddlewareTuple {
  return [[fn, undefined], params || {}]
}

describe('compose', () => {
  const middleware: MiddlewareTuple[] = []

  const a = async (c: C, next: Function) => {
    c.req['log'] = 'log'
    await next()
  }

  const b = async (c: C, next: Function) => {
    await next()
    c.res['headers'] = 'custom-header'
  }

  const c = async (c: C, next: Function) => {
    c.req['xxx'] = 'yyy'
    await next()
    c.res['zzz'] = c.req['xxx']
  }

  const handler = async (c: C, next: Function) => {
    c.req['log'] = `${c.req.log} message`
    await next()
    c.res = { message: 'new response' }
  }

  middleware.push(buildMiddlewareTuple(a))
  middleware.push(buildMiddlewareTuple(b))
  middleware.push(buildMiddlewareTuple(c))
  middleware.push(buildMiddlewareTuple(handler))

  it('Request', async () => {
    const c: C = { req: {}, res: {}, finalized: false }
    const composed = compose<C>(middleware)
    const context = await composed(c)
    expect(context.req['log']).not.toBeNull()
    expect(context.req['log']).toBe('log message')
    expect(context.req['xxx']).toBe('yyy')
  })
  it('Response', async () => {
    const c: C = { req: {}, res: {}, finalized: false }
    const composed = compose<C>(middleware)
    const context = await composed(c)
    expect(context.res['headers']).not.toBeNull()
    expect(context.res['headers']).toBe('custom-header')
    expect(context.res['message']).toBe('new response')
    expect(context.res['zzz']).toBe('yyy')
  })
})

describe('compose with returning a promise, non-async function', () => {
  const handlers: MiddlewareTuple[] = [
    buildMiddlewareTuple(() => {
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve({ message: 'new response' })
        }, 1)
      )
    }),
  ]

  it('Response', async () => {
    const c: C = { req: {}, res: {}, finalized: false }
    const composed = compose<C>(handlers)
    const context = await composed(c)
    expect(context.res['message']).toBe('new response')
  })
})

describe('Handler and middlewares', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new HonoRequest(new Request('http://localhost/'))
  const c: Context = new Context(req)

  const mHandlerFoo = async (c: Context, next: Function) => {
    c.req.raw.headers.append('x-header-foo', 'foo')
    await next()
  }

  const mHandlerBar = async (c: Context, next: Function) => {
    await next()
    c.header('x-header-bar', 'bar')
  }

  const handler = (c: Context) => {
    const foo = c.req.header('x-header-foo') || ''
    return c.text(foo)
  }

  middleware.push(buildMiddlewareTuple(mHandlerFoo))
  middleware.push(buildMiddlewareTuple(mHandlerBar))
  middleware.push(buildMiddlewareTuple(handler))

  it('Should return 200 Response', async () => {
    const composed = compose<Context>(middleware)
    const context = await composed(c)
    const res = context.res
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('foo')
    expect(res.headers.get('x-header-bar')).toBe('bar')
  })
})

describe('compose with Context - 200 success', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new HonoRequest(new Request('http://localhost/'))
  const c: Context = new Context(req)
  const handler = (c: Context) => {
    return c.text('Hello')
  }
  const mHandler = async (_c: Context, next: Function) => {
    await next()
  }

  middleware.push(buildMiddlewareTuple(handler))
  middleware.push(buildMiddlewareTuple(mHandler))

  it('Should return 200 Response', async () => {
    const composed = compose<Context>(middleware)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(200)
    expect(await context.res.text()).toBe('Hello')
  })
})

describe('compose with Context - 404 not found', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new HonoRequest(new Request('http://localhost/'))
  const onNotFound = (c: Context) => {
    return c.text('onNotFound', 404)
  }
  const onNotFoundAsync = async (c: Context) => {
    return c.text('onNotFoundAsync', 404)
  }
  const mHandler = async (_c: Context, next: Function) => {
    await next()
  }

  middleware.push(buildMiddlewareTuple(mHandler))

  it('Should return 404 Response', async () => {
    const c: Context = new Context(req)
    const composed = compose<Context>(middleware, undefined, onNotFound)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(404)
    expect(await context.res.text()).toBe('onNotFound')
    expect(context.finalized).toBe(true)
  })

  it('Should return 404 Response - async handler', async () => {
    const c: Context = new Context(req)
    const composed = compose<Context>(middleware, undefined, onNotFoundAsync)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(404)
    expect(await context.res.text()).toBe('onNotFoundAsync')
    expect(context.finalized).toBe(true)
  })
})

describe('compose with Context - 401 not authorized', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new HonoRequest(new Request('http://localhost/'))
  const c: Context = new Context(req)
  const handler = (c: Context) => {
    return c.text('Hello')
  }
  const mHandler = async (c: Context, next: Function) => {
    await next()
    c.res = new Response('Not authorized', { status: 401 })
  }

  middleware.push(buildMiddlewareTuple(mHandler))
  middleware.push(buildMiddlewareTuple(handler))

  it('Should return 401 Response', async () => {
    const composed = compose<Context>(middleware)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(401)
    expect(await context.res.text()).toBe('Not authorized')
    expect(context.finalized).toBe(true)
  })
})

describe('compose with Context - next() below', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new HonoRequest(new Request('http://localhost/'))
  const c: Context = new Context(req)
  const handler = (c: Context) => {
    const message = c.req.header('x-custom') || 'blank'
    return c.text(message)
  }
  const mHandler = async (c: Context, next: Function) => {
    c.req.raw.headers.append('x-custom', 'foo')
    await next()
  }

  middleware.push(buildMiddlewareTuple(mHandler))
  middleware.push(buildMiddlewareTuple(handler))

  it('Should return 200 Response', async () => {
    const composed = compose<Context>(middleware)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(200)
    expect(await context.res.text()).toBe('foo')
    expect(context.finalized).toBe(true)
  })
})

describe('compose with Context - 500 error', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new HonoRequest(new Request('http://localhost/'))
  const c: Context = new Context(req)

  it('Error on handler', async () => {
    const handler = () => {
      throw new Error()
    }

    const mHandler = async (_c: Context, next: Function) => {
      await next()
    }

    middleware.push(buildMiddlewareTuple(mHandler))
    middleware.push(buildMiddlewareTuple(handler))

    const onNotFound = (c: Context) => c.text('NotFound', 404)
    const onError = (_error: Error, c: Context) => c.text('onError', 500)

    const composed = compose<Context>(middleware, onError, onNotFound)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(500)
    expect(await context.res.text()).toBe('onError')
    expect(context.finalized).toBe(true)
  })

  it('Error on handler - async', async () => {
    const handler = () => {
      throw new Error()
    }

    middleware.push(buildMiddlewareTuple(handler))
    const onError = async (_error: Error, c: Context) => c.text('onError', 500)

    const composed = compose<Context>(middleware, onError)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(500)
    expect(await context.res.text()).toBe('onError')
    expect(context.finalized).toBe(true)
  })

  it('Run all the middlewares', async () => {
    const ctx: C = { req: {}, res: {}, finalized: false }
    const stack: number[] = []
    const middlewares = [
      async (_ctx: C, next: Function) => {
        stack.push(0)
        await next()
      },
      async (_ctx: C, next: Function) => {
        stack.push(1)
        await next()
      },
      async (_ctx: C, next: Function) => {
        stack.push(2)
        await next()
      },
    ].map((h) => buildMiddlewareTuple(h))
    const composed = compose(middlewares)
    await composed(ctx)
    expect(stack).toEqual([0, 1, 2])
  })
})
describe('compose with Context - not finalized', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  const c: Context = new Context(req)
  const onNotFound = (c: Context) => {
    return c.text('onNotFound', 404)
  }

  it('Should not be finalized - lack `next()`', async () => {
    const middleware: MiddlewareTuple[] = []
    const mHandler = async (_c: Context, next: Function) => {
      await next()
    }
    const mHandler2 = async () => {}

    middleware.push(buildMiddlewareTuple(mHandler))
    middleware.push(buildMiddlewareTuple(mHandler2))
    const composed = compose<Context>(middleware, undefined, onNotFound)
    const context = await composed(c)
    expect(context.finalized).toBe(false)
  })

  it('Should not be finalized - lack `return Response`', async () => {
    const middleware2: MiddlewareTuple[] = []
    const mHandler3 = async (_c: Context, next: Function) => {
      await next()
    }
    const handler = async () => {}
    middleware2.push(buildMiddlewareTuple(mHandler3))
    middleware2.push(buildMiddlewareTuple(handler))

    const composed = compose<Context>(middleware2, undefined, onNotFound)
    const context = await composed(c)
    expect(context.finalized).toBe(false)
  })
})

describe('Compose', function () {
  it('should get executed order one by one', async () => {
    const arr: number[] = []
    const stack = []
    const called: boolean[] = []

    stack.push(
      buildMiddlewareTuple(async (_context: C, next: Function) => {
        called.push(true)

        arr.push(1)
        await next()
        arr.push(6)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (_context: C, next: Function) => {
        called.push(true)

        arr.push(2)
        await next()
        arr.push(5)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (_context: C, next: Function) => {
        called.push(true)

        arr.push(3)
        await next()
        arr.push(4)
      })
    )

    await compose(stack)({ res: null, finalized: false })
    expect(called).toEqual([true, true, true])
    expect(arr).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('should not get executed if previous next() not triggered', async () => {
    const arr: number[] = []
    const stack = []
    const called: boolean[] = []

    stack.push(
      buildMiddlewareTuple(async (_context: C, next: Function) => {
        called.push(true)

        arr.push(1)
        await next()
        arr.push(6)
      })
    )

    stack.push(
      buildMiddlewareTuple(async () => {
        called.push(true)
        arr.push(2)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (_context: C, next: Function) => {
        called.push(true)

        arr.push(3)
        await next()
        arr.push(4)
      })
    )

    await compose(stack)({ res: null, finalized: false })
    expect(called).toEqual([true, true])
    expect(arr).toEqual([1, 2, 6])
  })

  it('should be able to be called twice', async () => {
    type C = {
      arr: number[]
    }
    const stack = []

    stack.push(
      buildMiddlewareTuple(async (context: C, next: Function) => {
        context.arr.push(1)
        await next()
        context.arr.push(6)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (context: C, next: Function) => {
        context.arr.push(2)
        await next()
        context.arr.push(5)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (context: C, next: Function) => {
        context.arr.push(3)
        await next()
        context.arr.push(4)
      })
    )

    const fn = compose(stack)
    const ctx1 = { arr: [] as number[], res: null, finalized: false }
    const ctx2 = { arr: [] as number[], res: null, finalized: false }
    const out = [1, 2, 3, 4, 5, 6]

    await fn(ctx1)

    expect(out).toEqual(ctx1.arr)
    await fn(ctx2)

    expect(out).toEqual(ctx2.arr)
  })

  it('should create next functions that return a Promise', async () => {
    const stack = []
    const arr: unknown[] = []
    for (let i = 0; i < 5; i++) {
      stack.push(
        buildMiddlewareTuple((_context: C, next: Function) => {
          arr.push(next())
        })
      )
    }

    await compose(stack)({ res: null, finalized: false })

    for (const next of arr) {
      const isPromise = !!(next as { then?: Function })?.then
      expect(isPromise).toBe(true)
    }
  })

  it('should work with 0 middleware', async () => {
    await compose([])({ res: null, finalized: false })
  })

  it('should work when yielding at the end of the stack', async () => {
    const stack = []
    let called = false

    stack.push(
      buildMiddlewareTuple(async (_ctx: C, next: Function) => {
        await next()
        called = true
      })
    )

    await compose(stack)({ res: null, finalized: false })
    expect(called).toBe(true)
  })

  it('should reject on errors in middleware', async () => {
    const stack = []

    stack.push(
      buildMiddlewareTuple(() => {
        throw new ExpectedError()
      })
    )

    try {
      await compose(stack)({ res: null, finalized: false })
      throw new Error('promise was not rejected')
    } catch (e) {
      expect(e).toBeInstanceOf(ExpectedError)
    }
  })

  it('should keep the context', async () => {
    const ctx = { res: null, finalized: false }

    const stack = []

    stack.push(
      buildMiddlewareTuple(async (ctx2: C, next: Function) => {
        await next()
        expect(ctx2).toEqual(ctx)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (ctx2: C, next: Function) => {
        await next()
        expect(ctx2).toEqual(ctx)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (ctx2: C, next: Function) => {
        await next()
        expect(ctx2).toEqual(ctx)
      })
    )

    await compose(stack)(ctx)
  })

  it('should catch downstream errors', async () => {
    const arr: number[] = []
    const stack = []

    stack.push(
      buildMiddlewareTuple(async (_ctx: C, next: Function) => {
        arr.push(1)
        try {
          arr.push(6)
          await next()
          arr.push(7)
        } catch (err) {
          arr.push(2)
        }
        arr.push(3)
      })
    )

    stack.push(
      buildMiddlewareTuple(async () => {
        arr.push(4)
        throw new Error()
      })
    )

    await compose(stack)({ res: null, finalized: false })
    expect(arr).toEqual([1, 6, 4, 2, 3])
  })

  it('should compose w/ next', async () => {
    let called = false

    await compose([])({ res: null, finalized: false }, async () => {
      called = true
    })
    expect(called).toBe(true)
  })

  it('should handle errors in wrapped non-async functions', async () => {
    const stack = []

    stack.push(
      buildMiddlewareTuple(function () {
        throw new ExpectedError()
      })
    )

    try {
      await compose(stack)({ res: null, finalized: false })
      throw new Error('promise was not rejected')
    } catch (e) {
      expect(e).toBeInstanceOf(ExpectedError)
    }
  })

  // https://github.com/koajs/compose/pull/27#issuecomment-143109739
  it('should compose w/ other compositions', async () => {
    const called: number[] = []

    await compose([
      buildMiddlewareTuple(
        compose([
          buildMiddlewareTuple((_ctx: C, next: Function) => {
            called.push(1)
            return next()
          }),
          buildMiddlewareTuple((_ctx: C, next: Function) => {
            called.push(2)
            return next()
          }),
        ])
      ),
      buildMiddlewareTuple((_ctx: C, next: Function) => {
        called.push(3)
        return next()
      }),
    ])({ res: null, finalized: false })

    expect(called).toEqual([1, 2, 3])
  })

  it('should throw if next() is called multiple times', async () => {
    try {
      await compose([
        buildMiddlewareTuple(async (_ctx: C, next: Function) => {
          await next()
          await next()
        }),
      ])({ res: null, finalized: false })
      throw new Error('boom')
    } catch (err) {
      expect(err instanceof Error && /multiple times/.test(err.message)).toBe(true)
    }
  })

  it('should return a valid middleware', async () => {
    let val = 0
    await compose([
      buildMiddlewareTuple(
        compose([
          buildMiddlewareTuple((_ctx: C, next: Function) => {
            val++
            return next()
          }),
          buildMiddlewareTuple((_ctx: C, next: Function) => {
            val++
            return next()
          }),
        ])
      ),
      buildMiddlewareTuple((_ctx: C, next: Function) => {
        val++
        return next()
      }),
    ])({ res: null, finalized: false })

    expect(val).toEqual(3)
  })

  it('should return last return value', async () => {
    type C = {
      val: number
      finalized: boolean
      res: unknown
    }
    const stack = []

    stack.push(
      buildMiddlewareTuple(async (ctx: C, next: Function) => {
        await next()
        expect(ctx.val).toEqual(2)
        ctx.val = 1
      })
    )

    stack.push(
      buildMiddlewareTuple(async (ctx: C, next: Function) => {
        ctx.val = 2
        await next()
        expect(ctx.val).toEqual(2)
      })
    )

    const res = await compose<C>(stack)({ val: 0, res: null, finalized: false })
    expect(res.val).toEqual(1)
  })

  it('should not affect the original middleware array', () => {
    const middleware: MiddlewareTuple[] = []
    const fn1 = (_ctx: C, next: Function) => {
      return next()
    }
    middleware.push(buildMiddlewareTuple(fn1))

    for (const [[fn]] of middleware) {
      expect(fn).toEqual(fn1)
    }

    compose(middleware)

    for (const [[fn]] of middleware) {
      expect(fn).toEqual(fn1)
    }
  })

  it('should not get stuck on the passed in next', async () => {
    type C = {
      middleware: number
      next: number
      finalized: boolean
      res: unknown
    }

    const middleware = [
      buildMiddlewareTuple((ctx: C, next: Function) => {
        ctx.middleware++
        return next()
      }),
    ]
    const ctx = {
      middleware: 0,
      next: 0,
      finalized: false,
      res: null,
    }

    await compose<C>(middleware)(ctx, (ctx: C, next: Function) => {
      ctx.next++
      return next()
    })

    expect(ctx.middleware).toEqual(1)
    expect(ctx.next).toEqual(1)
  })
})
