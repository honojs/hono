/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Hono } from './hono'
import { poweredBy } from './middleware/powered-by'
import type { CustomHandler as Handler, ExtractSchema, InputToData } from './types'
import type { Expect, Equal } from './utils/types'

describe('Test types of CustomHandler', () => {
  type E = {
    Variables: {
      foo: number
    }
  }

  const url = 'http://localhost/'

  test('Env', async () => {
    const app = new Hono<E>()
    const handler: Handler<E> = (c) => {
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<number, typeof foo>>
      const id = c.req.param('id')
      type verifyPath = Expect<Equal<string, typeof id>>
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Env, Path', async () => {
    const app = new Hono<E>()
    const handler: Handler<E, '/'> = (c) => {
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<number, typeof foo>>
      const data = c.req.valid()
      return c.text('Hi')
    }
    app.get('/', handler)

    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  type User = {
    name: string
    age: number
  }

  test('Env, Path, Type', async () => {
    const app = new Hono<E>()
    const handler: Handler<E, '/', { json: User }> = (c) => {
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<number, typeof foo>>
      const add = c.req.valid()
      const { name, age } = c.req.valid()
      type verifySchema = Expect<Equal<string, typeof name>>
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Type', () => {
    const handler: Handler<{ json: User }> = (c) => {
      const user = c.req.valid()
      type verifySchema = Expect<Equal<User, typeof user>>
      return c.text('Hi')
    }
  })
})

describe('`jsonT()`', () => {
  const app = new Hono<{ Variables: { foo: string } }>()

  app.get('/post/:id', (c) => {
    c.req.param('id')
    const id = c.req.param('id')
    return c.text('foo')
  })

  const route = app.get('/hello', (c) => {
    return c.jsonT({
      message: 'Hello!',
    })
  })

  type Actual = ExtractSchema<typeof route>

  type Expected = {
    '/hello': {
      $get: {
        input: {}
        output: {
          message: string
        }
      }
    }
  }

  type verify = Expect<Equal<Expected, Actual>>
})

describe('Env with Middleware', () => {
  type E = {
    Variables: {
      foo: string
    }
  }
  const app = new Hono<E>()
  app.use('*', poweredBy())
})

describe('InputToData', () => {
  type input = {
    json: {
      id: number
      title: string
    }
  }
  type verify = InputToData<input>
})
