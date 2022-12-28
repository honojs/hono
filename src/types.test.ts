/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Hono } from './hono'
import type {
  Environment,
  CustomHandler as Handler,
  InputToData,
  MiddlewareHandler,
  RemoveBlankFromValue,
  ToAppType,
} from './types'
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

  test('Env', async () => {
    const handler: Handler<Env> = (c) => {
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<typeof foo, string>>
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

  test('Env, Path', async () => {
    const handler: Handler<Env, 'id'> = (c) => {
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

  type User = {
    name: string
    age: number
  }

  test('Env, Path, Type', async () => {
    const handler: Handler<Env, 'id', User> = (c) => {
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<typeof foo, string>>
      const { name, age } = c.req.valid()
      type verifySchema = Expect<Equal<typeof name, string>>
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Type', () => {
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

describe('Types used in the validator', () => {
  test('RemoveBlankFromValue', () => {
    type ValidateResult = {
      post:
        | {}
        | { type: 'query'; data: { page: number } }
        | { type: 'form'; data: { title: string } }
    }
    type ActualType = RemoveBlankFromValue<ValidateResult>
    type ExpectedType = {
      post:
        | {
            type: 'query'
            data: {
              page: number
            }
          }
        | {
            type: 'form'
            data: {
              title: string
            }
          }
    }
    type verify = Expect<Equal<ExpectedType, ActualType>>
  })

  test('ToAppType', () => {
    type SampleHono = Hono<
      Environment,
      '/author',
      {
        post: {} | { type: 'json'; data: { name: string; age: number } }
      },
      { name: string; age: number }
    >
    type ActualType = ToAppType<SampleHono>
    type ExpectedType = {
      post: {
        '/author': {
          input: {
            json: {
              name: string
              age: number
            }
          }
          output: {
            json: {
              name: string
              age: number
            }
          }
        }
      }
    }
    type verify = Expect<Equal<ExpectedType, ActualType>>
  })

  test('InputToData', () => {
    type P = {
      post:
        | {}
        | {
            type: 'json'
            data: {
              id: number
              title: string
            }
          }
    }

    type P2 = {
      post:
        | {}
        | { type: 'query'; data: { page: number } }
        | { type: 'form'; data: { title: string } }
    }

    type User = {
      name: string
      age: number
    }

    type ExpectData = {
      id: number
      title: string
    }

    type ExpectData2 = {
      page: number
    } & {
      title: string
    }

    type verify = Expect<Equal<ExpectData, InputToData<P>>>
    type verify2 = Expect<Equal<ExpectData2, InputToData<P2>>>
    type verify3 = Expect<Equal<User, InputToData<User>>>
  })
})
