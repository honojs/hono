import { compose } from '@/compose'
import { Context } from '@/context'

type C = {
  req: Record<string, string>
  res: Record<string, string>
}

describe('compose', () => {
  const middleware: Function[] = []

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

  middleware.push(a)
  middleware.push(b)
  middleware.push(c)
  middleware.push(handler)

  it('Request', async () => {
    const c: C = { req: {}, res: {} }
    const composed = compose<C>(middleware)
    const context = await composed(c)
    expect(context.req['log']).not.toBeNull()
    expect(context.req['log']).toBe('log message')
    expect(context.req['xxx']).toBe('yyy')
  })
  it('Response', async () => {
    const c: C = { req: {}, res: {} }
    const composed = compose<C>(middleware)
    const context = await composed(c)
    expect(context.res['headers']).not.toBeNull()
    expect(context.res['headers']).toBe('custom-header')
    expect(context.res['message']).toBe('new response')
    expect(context.res['zzz']).toBe('yyy')
  })
})

describe('compose with Context', () => {
  const middleware: Function[] = []

  const req = new Request('http://localhost/')
  const c: Context = new Context(req)
  const onError = (error: Error, c: Context) => {
    return c.text('onError', 500)
  }

  it('Error on handler', async () => {
    const handler = () => {
      throw new Error()
    }

    const mHandler = async (c: Context, next: Function) => {
      await next()
    }

    middleware.push(mHandler)
    middleware.push(handler)

    const composed = compose<Context>(middleware, onError)
    const context = await composed(c)
    expect(context.res).not.toBeNull()
    expect(context.res.status).toBe(500)
    expect(await context.res.text()).toBe('onError')
  })

  it('Error on middleware', async () => {
    const handler = (c: Context) => {
      return c.text('OK')
    }

    const mHandler = async () => {
      throw new Error()
    }

    middleware.push(mHandler)
    middleware.push(handler)

    const composed = compose<Context>(middleware, onError)
    const context = await composed(c)
    expect(c.res).not.toBeNull()
    expect(c.res.status).toBe(500)
    expect(await context.res.text()).toBe('onError')
  })

  it('Run all the middlewares', async () => {
    const ctx: C = { req: {}, res: {} }
    const stack: number[] = []
    const middlewares = [
      async (ctx: C, next: Function) => {
        stack.push(0)
        await next()
      },
      async (ctx: C, next: Function) => {
        stack.push(1)
        await next()
      },
      async (ctx: C, next: Function) => {
        stack.push(2)
        await next()
      },
    ]
    const composed = await compose(middlewares)
    await composed(ctx)
    expect(stack).toEqual([0, 1, 2])
  })
})

describe('Compose', function () {
  function isPromise(x: any) {
    return x && typeof x.then === 'function'
  }

  it('should work', async () => {
    const arr: number[] = []
    const stack = []

    stack.push(async (context: C, next: Function) => {
      arr.push(1)
      await next()
      arr.push(6)
    })

    stack.push(async (context: C, next: Function) => {
      arr.push(2)
      await next()
      arr.push(5)
    })

    stack.push(async (context: C, next: Function) => {
      arr.push(3)
      await next()
      arr.push(4)
    })

    await compose(stack)({})
    expect(arr).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]))
  })

  it('should be able to be called twice', () => {
    type C = {
      arr: number[]
    }
    const stack = []

    stack.push(async (context: C, next: Function) => {
      context.arr.push(1)
      await next()
      context.arr.push(6)
    })

    stack.push(async (context: C, next: Function) => {
      context.arr.push(2)
      await next()
      context.arr.push(5)
    })

    stack.push(async (context: C, next: Function) => {
      context.arr.push(3)
      await next()
      context.arr.push(4)
    })

    const fn = compose(stack)
    const ctx1 = { arr: [] as number[] }
    const ctx2 = { arr: [] as number[] }
    const out = [1, 2, 3, 4, 5, 6]

    return fn(ctx1)
      .then(() => {
        expect(out).toEqual(ctx1.arr)
        return fn(ctx2)
      })
      .then(() => {
        expect(out).toEqual(ctx2.arr)
      })
  })

  it('should create next functions that return a Promise', function () {
    const stack: any[] = []
    const arr: any[] = []
    for (let i = 0; i < 5; i++) {
      stack.push((context: C, next: Function) => {
        arr.push(next())
      })
    }

    compose(stack)({})

    for (const next of arr) {
      expect(isPromise(next)).toBe(true)
    }
  })

  it('should work with 0 middleware', function () {
    return compose([])({})
  })

  it('should work when yielding at the end of the stack', async () => {
    const stack = []
    let called = false

    stack.push(async (ctx: C, next: Function) => {
      await next()
      called = true
    })

    await compose(stack)({})
    expect(called).toBe(true)
  })

  it('should reject on errors in middleware', () => {
    const stack = []

    stack.push(() => {
      throw new Error()
    })

    return compose(stack)({}).then(
      () => {
        throw new Error('promise was not rejected')
      },
      (e) => {
        expect(e).toBeInstanceOf(Error)
      }
    )
  })

  it('should keep the context', () => {
    const ctx = {}

    const stack = []

    stack.push(async (ctx2: C, next: Function) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })

    stack.push(async (ctx2: C, next: Function) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })

    stack.push(async (ctx2: C, next: Function) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })

    return compose(stack)(ctx)
  })

  it('should catch downstream errors', async () => {
    const arr: any[] = []
    const stack = []

    stack.push(async (ctx: C, next: Function) => {
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

    stack.push(async (ctx: C, next: Function) => {
      arr.push(4)
      throw new Error()
    })

    await compose(stack)({})
    expect(arr).toEqual([1, 6, 4, 2, 3])
  })

  it('should compose w/ next', () => {
    let called = false

    return compose([])({}, async () => {
      called = true
    }).then(function () {
      expect(called).toBe(true)
    })
  })

  it('should handle errors in wrapped non-async functions', () => {
    const stack = []

    stack.push(function () {
      throw new Error()
    })

    return compose(stack)({}).then(
      () => {
        throw new Error('promise was not rejected')
      },
      (e) => {
        expect(e).toBeInstanceOf(Error)
      }
    )
  })

  // https://github.com/koajs/compose/pull/27#issuecomment-143109739
  it('should compose w/ other compositions', () => {
    const called: number[] = []

    return compose([
      compose([
        (ctx: C, next: Function) => {
          called.push(1)
          return next()
        },
        (ctx: C, next: Function) => {
          called.push(2)
          return next()
        },
      ]),
      (ctx: C, next: Function) => {
        called.push(3)
        return next()
      },
    ])({}).then(() => expect(called).toEqual([1, 2, 3]))
  })

  it('should throw if next() is called multiple times', () => {
    return compose([
      async (ctx: C, next: Function) => {
        await next()
        await next()
      },
    ])({}).then(
      () => {
        throw new Error('boom')
      },
      (err) => {
        expect(/multiple times/.test(err.message)).toBe(true)
      }
    )
  })

  it('should return a valid middleware', () => {
    let val = 0
    return compose([
      compose([
        (ctx: C, next: Function) => {
          val++
          return next()
        },
        (ctx: C, next: Function) => {
          val++
          return next()
        },
      ]),
      (ctx: C, next: Function) => {
        val++
        return next()
      },
    ])({}).then(function () {
      expect(val).toEqual(3)
    })
  })

  it('should return last return value', async () => {
    type C = {
      val: number
    }
    const stack = []

    stack.push(async (ctx: C, next: Function) => {
      await next()
      expect(ctx.val).toEqual(2)
      ctx.val = 1
    })

    stack.push(async (ctx: C, next: Function) => {
      ctx.val = 2
      await next()
      expect(ctx.val).toEqual(2)
    })

    const res = await compose(stack)({ val: 0 })
    expect(res).toEqual({ val: 1 })
  })

  it('should not affect the original middleware array', () => {
    const middleware = []
    const fn1 = (ctx: C, next: Function) => {
      return next()
    }
    middleware.push(fn1)

    for (const fn of middleware) {
      expect(fn).toEqual(fn1)
    }

    compose(middleware)

    for (const fn of middleware) {
      expect(fn).toEqual(fn1)
    }
  })

  it('should not get stuck on the passed in next', () => {
    type C = {
      middleware: number
      next: number
    }

    const middleware = [
      (ctx: C, next: Function) => {
        ctx.middleware++
        return next()
      },
    ]
    const ctx = {
      middleware: 0,
      next: 0,
    }

    return compose(middleware)(ctx, (ctx: C, next: Function) => {
      ctx.next++
      return next()
    }).then(() => {
      expect(ctx).toEqual({ middleware: 1, next: 1 })
    })
  })
})
