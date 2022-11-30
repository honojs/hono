/* eslint-disable @typescript-eslint/no-unused-vars */
import { Hono } from './hono'
import { validator } from './middleware/validator'
import type { CustomHandler as Handler } from './types'
import type { Expect, Equal, NotEqual } from './utils/types'
import type { Validator } from './validator/validator'

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

  const schema = (v: Validator) => ({
    query: v.query('q').isRequired(),
  })
  type Schema = ReturnType<typeof schema>
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

  test('Path, Env, Schema', async () => {
    const handler: Handler<'id', Env, Schema> = (c) => {
      const id = c.req.param('id')
      type verifyPath = Expect<Equal<typeof id, string>>
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<typeof foo, string>>
      const { query } = c.req.valid()
      type verifySchema = Expect<Equal<typeof query, string>>
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

  test('Env, Schema', async () => {
    const handler: Handler<Env, Schema> = (c) => {
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<typeof foo, string>>
      const { query } = c.req.valid()
      type verifySchema = Expect<Equal<typeof query, string>>
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Schema', async () => {
    const handler: Handler<Schema> = (c) => {
      const { query } = c.req.valid()
      type verifySchema = Expect<Equal<typeof query, string>>
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Complex', async () => {
    const app = new Hono<Env>()
    const handler: Handler<Env> = (c) => {
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<typeof foo, string>>
      const data = c.req.valid()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type verifySchema = Expect<Equal<typeof data['foo'], any>>
      return c.text(foo)
    }
    app.get(
      '/',
      async (c, next) => {
        c.set('foo', 'bar')
        await next()
      },
      handler
    )
    app.get('/v', validator(schema), (c) => {
      const { query } = c.req.valid()
      type verify = Expect<Equal<typeof query, string>>
      return c.text(query)
    })
    let res = await app.request(url)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('bar')

    res = await app.request('http://localhost/?q=bar')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('bar')
  })
})
