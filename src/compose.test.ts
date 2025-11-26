import { compose } from './compose'
import { Context } from './context'
import type { Params } from './router'
import type { Next } from './types'

type MiddlewareTuple = [[Function, unknown], Params]

class ExpectedError extends Error {}

function buildMiddlewareTuple(fn: Function, params?: Params): MiddlewareTuple {
  return [[fn, undefined], params || {}]
}

describe('compose', () => {
  const middleware: MiddlewareTuple[] = []

  const a = async (c: Context, next: Next) => {
    c.set('log', 'log')
    await next()
  }

  const b = async (c: Context, next: Next) => {
    await next()
    c.header('x-custom-header', 'custom-header')
  }

  const c = async (c: Context, next: Next) => {
    c.set('xxx', 'yyy')
    await next()
    c.set('zzz', 'xxx')
  }

  const handler = async (c: Context, next: Next) => {
    c.set('log', `${c.get('log')} message`)
    await next()
    return c.json({ message: 'new response' })
  }

  middleware.push(buildMiddlewareTuple(a))
  middleware.push(buildMiddlewareTuple(b))
  middleware.push(buildMiddlewareTuple(c))
  middleware.push(buildMiddlewareTuple(handler))

  it('Request', async () => {
    const composed = compose(middleware)
    const context = await composed(new Context(new Request('http://localhost/')))
    expect(context.get('log')).not.toBeNull()
    expect(context.get('log')).toBe('log message')
    expect(context.get('xxx')).toBe('yyy')
  })
  it('Response', async () => {
    const composed = compose(middleware)
    const context = await composed(new Context(new Request('http://localhost/')))
    expect(context.res.headers.get('x-custom-header')).not.toBeNull()
    expect(context.res.headers.get('x-custom-header')).toBe('custom-header')
    expect((await context.res.json())['message']).toBe('new response')
    expect(context.get('zzz')).toBe('xxx')
  })
})

describe('compose with returning a promise, non-async function', () => {
  const handlers: MiddlewareTuple[] = [
    buildMiddlewareTuple(() => {
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve(
            new Response(JSON.stringify({ message: 'new response' }), {
              headers: {
                'Content-Type': 'application/json',
              },
            })
          )
        })
      )
    }),
  ]

  it('Response', async () => {
    const composed = compose(handlers)
    const context = await composed(new Context(new Request('http://localhost/')))
    expect((await context.res.json())['message']).toBe('new response')
  })
})

describe('Handler and middlewares', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new Request('http://localhost/')
  const c: Context = new Context(req)

  const mHandlerFoo = async (c: Context, next: Next) => {
    c.req.raw.headers.append('x-header-foo', 'foo')
    await next()
  }

  const mHandlerBar = async (c: Context, next: Next) => {
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
    const composed = compose(middleware)
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

  const req = new Request('http://localhost/')
  const c: Context = new Context(req)
  const handler = (c: Context) => {
    return c.text('Hello')
  }
  const mHandler = async (_c: Context, next: Next) => {
    await next()
  }

  middleware.push(buildMiddlewareTuple(handler))
  middleware.push(buildMiddlewareTuple(mHandler))

  it('Should return 200 Response', async () => {
    const composed = compose(middleware)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(200)
    expect(await context.res.text()).toBe('Hello')
  })
})

describe('compose with Context - 404 not found', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new Request('http://localhost/')
  const onNotFound = (c: Context) => {
    return c.text('onNotFound', 404)
  }
  const onNotFoundAsync = async (c: Context) => {
    return c.text('onNotFoundAsync', 404)
  }
  const mHandler = async (_c: Context, next: Next) => {
    await next()
  }

  middleware.push(buildMiddlewareTuple(mHandler))

  it('Should return 404 Response', async () => {
    const c: Context = new Context(req)
    const composed = compose(middleware, undefined, onNotFound)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(404)
    expect(await context.res.text()).toBe('onNotFound')
    expect(context.finalized).toBe(true)
  })

  it('Should return 404 Response - async handler', async () => {
    const c: Context = new Context(req)
    const composed = compose(middleware, undefined, onNotFoundAsync)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(404)
    expect(await context.res.text()).toBe('onNotFoundAsync')
    expect(context.finalized).toBe(true)
  })
})

describe('compose with Context - 401 not authorized', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new Request('http://localhost/')
  const c: Context = new Context(req)
  const handler = (c: Context) => {
    return c.text('Hello')
  }
  const mHandler = async (c: Context, next: Next) => {
    await next()
    c.res = new Response('Not authorized', { status: 401 })
  }

  middleware.push(buildMiddlewareTuple(mHandler))
  middleware.push(buildMiddlewareTuple(handler))

  it('Should return 401 Response', async () => {
    const composed = compose(middleware)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(401)
    expect(await context.res.text()).toBe('Not authorized')
    expect(context.finalized).toBe(true)
  })
})

describe('compose with Context - next() below', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new Request('http://localhost/')
  const c: Context = new Context(req)
  const handler = (c: Context) => {
    const message = c.req.header('x-custom') || 'blank'
    return c.text(message)
  }
  const mHandler = async (c: Context, next: Next) => {
    c.req.raw.headers.append('x-custom', 'foo')
    await next()
  }

  middleware.push(buildMiddlewareTuple(mHandler))
  middleware.push(buildMiddlewareTuple(handler))

  it('Should return 200 Response', async () => {
    const composed = compose(middleware)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(200)
    expect(await context.res.text()).toBe('foo')
    expect(context.finalized).toBe(true)
  })
})

describe('compose with Context - 500 error', () => {
  const middleware: MiddlewareTuple[] = []

  const req = new Request('http://localhost/')
  const c: Context = new Context(req)

  it('Error on handler', async () => {
    const handler = () => {
      throw new Error()
    }

    const mHandler = async (_c: Context, next: Next) => {
      await next()
    }

    middleware.push(buildMiddlewareTuple(mHandler))
    middleware.push(buildMiddlewareTuple(handler))

    const onNotFound = (c: Context) => c.text('NotFound', 404)
    const onError = (_error: Error, c: Context) => c.text('onError', 500)

    const composed = compose(middleware, onError, onNotFound)
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

    const composed = compose(middleware, onError)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(500)
    expect(await context.res.text()).toBe('onError')
    expect(context.finalized).toBe(true)
  })

  it('Run all the middlewares', async () => {
    const stack: number[] = []
    const middlewares = [
      async (_ctx: Context, next: Next) => {
        stack.push(0)
        await next()
      },
      async (_ctx: Context, next: Next) => {
        stack.push(1)
        await next()
      },
      async (_ctx: Context, next: Next) => {
        stack.push(2)
        await next()
      },
    ].map((h) => buildMiddlewareTuple(h))
    const composed = compose(middlewares)
    await composed(new Context(new Request('http://localhost/')))
    expect(stack).toEqual([0, 1, 2])
  })
})
describe('compose with Context - not finalized', () => {
  const req = new Request('http://localhost/')
  const c: Context = new Context(req)
  const onNotFound = (c: Context) => {
    return c.text('onNotFound', 404)
  }

  it('Should not be finalized - lack `next()`', async () => {
    const middleware: MiddlewareTuple[] = []
    const mHandler = async (_c: Context, next: Next) => {
      await next()
    }
    const mHandler2 = async () => {}

    middleware.push(buildMiddlewareTuple(mHandler))
    middleware.push(buildMiddlewareTuple(mHandler2))
    const composed = compose(middleware, undefined, onNotFound)
    const context = await composed(c)
    expect(context.finalized).toBe(false)
  })

  it('Should not be finalized - lack `return Response`', async () => {
    const middleware2: MiddlewareTuple[] = []
    const mHandler3 = async (_c: Context, next: Next) => {
      await next()
    }
    const handler = async () => {}
    middleware2.push(buildMiddlewareTuple(mHandler3))
    middleware2.push(buildMiddlewareTuple(handler))

    const composed = compose(middleware2, undefined, onNotFound)
    const context = await composed(c)
    expect(context.finalized).toBe(false)
  })
})
describe('compose with Context - next', () => {
  const req = new Request('http://localhost/')
  const c: Context = new Context(req)

  it('Should throw multiple call error', async () => {
    const middleware: MiddlewareTuple[] = []
    const mHandler = async (_c: Context, next: Next) => {
      await next()
    }
    const mHandler2 = async (_c: Context, next: Next) => {
      await next()
      await next()
    }

    middleware.push(buildMiddlewareTuple(mHandler))
    middleware.push(buildMiddlewareTuple(mHandler2))

    const composed = compose(middleware)
    try {
      await composed(c)
    } catch (err) {
      expect(err).toStrictEqual(new Error('next() called multiple times'))
    }
  })
})

describe('Compose', function () {
  it('should get executed order one by one', async () => {
    const arr: number[] = []
    const stack = []
    const called: boolean[] = []

    stack.push(
      buildMiddlewareTuple(async (_context: Context, next: Next) => {
        called.push(true)

        arr.push(1)
        await next()
        arr.push(6)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (_context: Context, next: Next) => {
        called.push(true)

        arr.push(2)
        await next()
        arr.push(5)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (_context: Context, next: Next) => {
        called.push(true)

        arr.push(3)
        await next()
        arr.push(4)
      })
    )

    await compose(stack)(new Context(new Request('http://localhost/')))
    expect(called).toEqual([true, true, true])
    expect(arr).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('should not get executed if previous next() not triggered', async () => {
    const arr: number[] = []
    const stack = []
    const called: boolean[] = []

    stack.push(
      buildMiddlewareTuple(async (_context: Context, next: Next) => {
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
      buildMiddlewareTuple(async (_context: Context, next: Next) => {
        called.push(true)

        arr.push(3)
        await next()
        arr.push(4)
      })
    )

    await compose(stack)(new Context(new Request('http://localhost/')))
    expect(called).toEqual([true, true])
    expect(arr).toEqual([1, 2, 6])
  })

  it('should be able to be called twice', async () => {
    const stack = []

    stack.push(
      buildMiddlewareTuple(async (context: Context, next: Next) => {
        context.get('arr').push(1)
        await next()
        context.get('arr').push(6)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (context: Context, next: Next) => {
        context.get('arr').push(2)
        await next()
        context.get('arr').push(5)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (context: Context, next: Next) => {
        context.get('arr').push(3)
        await next()
        context.get('arr').push(4)
      })
    )

    const fn = compose(stack)
    const ctx1 = new Context(new Request('http://localhost/'))

    ctx1.set('arr', [])

    const ctx2 = new Context(new Request('http://localhost/'))

    ctx2.set('arr', [])

    const out = [1, 2, 3, 4, 5, 6]

    await fn(ctx1)

    expect(out).toEqual(ctx1.get('arr'))
    await fn(ctx2)

    expect(out).toEqual(ctx2.get('arr'))
  })

  it('should create next functions that return a Promise', async () => {
    const stack = []
    const arr: unknown[] = []
    for (let i = 0; i < 5; i++) {
      stack.push(
        buildMiddlewareTuple((_context: Context, next: Next) => {
          arr.push(next())
        })
      )
    }

    await compose(stack)(new Context(new Request('http://localhost/')))

    for (const next of arr) {
      const isPromise = !!(next as { then?: Function })?.then
      expect(isPromise).toBe(true)
    }
  })

  it('should work with 0 middleware', async () => {
    await compose([])(new Context(new Request('http://localhost/')))
  })

  it('should work when yielding at the end of the stack', async () => {
    const stack = []
    let called = false

    stack.push(
      buildMiddlewareTuple(async (_ctx: Context, next: Next) => {
        await next()
        called = true
      })
    )

    await compose(stack)(new Context(new Request('http://localhost/')))
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
      await compose(stack)(new Context(new Request('http://localhost/')))
      throw new Error('promise was not rejected')
    } catch (e) {
      expect(e).toBeInstanceOf(ExpectedError)
    }
  })

  it('should keep the context', async () => {
    const ctx = new Context(new Request('http://localhost/'))

    const stack = []

    stack.push(
      buildMiddlewareTuple(async (ctx2: Context, next: Next) => {
        await next()
        expect(ctx2).toEqual(ctx)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (ctx2: Context, next: Next) => {
        await next()
        expect(ctx2).toEqual(ctx)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (ctx2: Context, next: Next) => {
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
      buildMiddlewareTuple(async (_ctx: Context, next: Next) => {
        arr.push(1)
        try {
          arr.push(6)
          await next()
          arr.push(7)
        } catch {
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

    await compose(stack)(new Context(new Request('http://localhost/')))
    expect(arr).toEqual([1, 6, 4, 2, 3])
  })

  it('should compose w/ next', async () => {
    let called = false

    await compose([])(new Context(new Request('http://localhost/')), async () => {
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
      await compose(stack)(new Context(new Request('http://localhost/')))
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
          buildMiddlewareTuple((_ctx: Context, next: Next) => {
            called.push(1)
            return next()
          }),
          buildMiddlewareTuple((_ctx: Context, next: Next) => {
            called.push(2)
            return next()
          }),
        ])
      ),
      buildMiddlewareTuple((_ctx: Context, next: Next) => {
        called.push(3)
        return next()
      }),
    ])(new Context(new Request('http://localhost/')))

    expect(called).toEqual([1, 2, 3])
  })

  it('should throw if next() is called multiple times', async () => {
    try {
      await compose([
        buildMiddlewareTuple(async (_ctx: Context, next: Next) => {
          await next()
          await next()
        }),
      ])(new Context(new Request('http://localhost/')))
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
          buildMiddlewareTuple((_ctx: Context, next: Next) => {
            val++
            return next()
          }),
          buildMiddlewareTuple((_ctx: Context, next: Next) => {
            val++
            return next()
          }),
        ])
      ),
      buildMiddlewareTuple((_ctx: Context, next: Next) => {
        val++
        return next()
      }),
    ])(new Context(new Request('http://localhost/')))

    expect(val).toEqual(3)
  })

  it('should return last return value', async () => {
    const stack = []

    stack.push(
      buildMiddlewareTuple(async (ctx: Context, next: Next) => {
        await next()
        expect(ctx.get('val')).toEqual(2)
        ctx.set('val', 1)
      })
    )

    stack.push(
      buildMiddlewareTuple(async (ctx: Context, next: Next) => {
        ctx.set('val', 2)
        await next()
        expect(ctx.get('val')).toEqual(2)
      })
    )

    const res = await compose(stack)(new Context(new Request('http://localhost/')))
    expect(res.get('val')).toEqual(1)
  })

  it('should not affect the original middleware array', () => {
    const middleware: MiddlewareTuple[] = []
    const fn1 = (_ctx: Context, next: Next) => {
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
    const middleware = [
      buildMiddlewareTuple((ctx: Context, next: Next) => {
        ctx.set('middleware', ctx.get('middleware') + 1)
        return next()
      }),
    ]

    const ctx = new Context(new Request('http://localhost/'))

    ctx.set('middleware', 0)
    ctx.set('next', 0)

    await compose(middleware)(ctx, ((ctx: Context, next: Next) => {
      ctx.set('next', ctx.get('next') + 1)
      return next()
    }) as Next)

    expect(ctx.get('middleware')).toEqual(1)
    expect(ctx.get('next')).toEqual(1)
  })
})

describe('compose - middleware redirect after error', () => {
  it('should allow middleware to redirect after catching an error', async () => {
    const middleware: MiddlewareTuple[] = []

    const req = new Request('http://localhost/')
    const c: Context = new Context(req)

    // Middleware that catches errors and redirects
    const errorHandlerMiddleware = async (c: Context, next: Next) => {
      await next()
      if (c.error) {
        return c.redirect('/error-page')
      }
    }

    // Handler that throws an error
    const handler = () => {
      throw new Error('Something went wrong')
    }

    middleware.push(buildMiddlewareTuple(errorHandlerMiddleware))
    middleware.push(buildMiddlewareTuple(handler))

    const onError = (_error: Error, c: Context) => c.text('Internal Server Error', 500)

    const composed = compose(middleware, onError)
    const context = await composed(c)
    
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(302)
    expect(context.res.headers.get('Location')).toBe('/error-page')
    expect(context.finalized).toBe(true)
  })

  it('should allow middleware to handle errors without redirect', async () => {
    const middleware: MiddlewareTuple[] = []

    const req = new Request('http://localhost/')
    const c: Context = new Context(req)

    // Middleware that just checks for errors but does nothing
    const checkMiddleware = async (c: Context, next: Next) => {
      await next()
      // Check error but don't return anything, let error response pass through
    }

    // Handler that throws an error
    const handler = () => {
      throw new Error('Something went wrong')
    }

    middleware.push(buildMiddlewareTuple(checkMiddleware))
    middleware.push(buildMiddlewareTuple(handler))

    const onError = (_error: Error, c: Context) => c.text('Error handled', 500)

    const composed = compose(middleware, onError)
    const context = await composed(c)
    
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(500)
    expect(await context.res.text()).toBe('Error handled')
    expect(context.finalized).toBe(true)
  })
})
