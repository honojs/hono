/* eslint-disable @typescript-eslint/no-unused-vars */
import { Hono } from './hono'
import type { CustomHandler as Handler, MiddlewareHandler } from './types'
import type { Expect, Equal, NotEqual } from './utils/types'

describe('Test types of CustomHandler', () => {
  type Env = {
    Variables: {
      foo: string
    }
  }

  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  const url = 'http://localhost/'

  test('No arguments', async () => {
    const handler: Handler = (c) => {
      const data = c.req.valid()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type verifySchema = Expect<Equal<typeof data['foo'], any>>
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Path', async () => {
    const handler: Handler<'id'> = (c) => {
      const id = c.req.param('id')
      type verifyPath = Expect<Equal<typeof id, string>>
      const data = c.req.valid()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type verifySchema = Expect<Equal<typeof data['foo'], any>>
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Path, Env', async () => {
    const handler: Handler<'id', Env> = (c) => {
      const id = c.req.param('id')
      type verifyPath = Expect<Equal<typeof id, string>>
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<typeof foo, string>>
      const data = c.req.valid()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type verifySchema = Expect<Equal<typeof data['foo'], any>>
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Env', async () => {
    const handler: Handler<Env> = (c) => {
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<typeof foo, string>>
      const { query } = c.req.valid()
      type verifySchema = Expect<NotEqual<typeof query, string>>
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Normal types', () => {
    type User = {
      name: string
      age: number
    }

    const handler: Handler<User> = (c) => {
      const user = c.req.valid()
      type verifySchema = Expect<Equal<typeof user, User>>
      return c.text('Hi')
    }
  })
})

describe('CustomHandler as middleware', () => {
  const app = new Hono()
  const mid1 = (): MiddlewareHandler => {
    return async (_c, next) => {
      await next()
    }
  }

  const mid2 = (): Handler<{ Foo: string }> => {
    return async (_c, next) => {
      await next()
    }
  }

  it('Should not throw Type error', async () => {
    app.get('*', mid1(), mid2(), (c) => {
      return c.text('foo')
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
  })
})
