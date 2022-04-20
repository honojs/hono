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
})
