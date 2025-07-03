/* eslint-disable @typescript-eslint/no-unused-vars */
import { expectTypeOf } from 'vitest'
import { hc } from '../../client'
import type { ClientRequest } from '../../client/types'
import { Hono } from '../../index'
import type { ExtractSchema, ToSchema, TypedResponse } from '../../types'
import type { ContentfulStatusCode } from '../../utils/http-status'
import type { Equal, Expect } from '../../utils/types'
import { validator } from '../../validator'
import { createFactory, createMiddleware } from './index'

describe('createMiddleware', () => {
  type Env = { Variables: { foo: string } }
  const app = new Hono()

  const mw = (message: string) =>
    createMiddleware<Env>(async (c, next) => {
      expectTypeOf(c.var.foo).toEqualTypeOf<string>()
      c.set('foo', 'bar')
      await next()
      c.header('X-Message', message)
    })

  const route = app.get('/message', mw('Hello Middleware'), (c) => {
    return c.text(`Hey, ${c.var.foo}`)
  })

  it('Should return the correct header and the content', async () => {
    const res = await app.request('/message')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-message')).toBe('Hello Middleware')
    expect(await res.text()).toBe('Hey, bar')
  })

  it('Should provide the correct types', async () => {
    const client = hc<typeof route>('http://localhost')
    const url = client.message.$url()
    expect(url.pathname).toBe('/message')
  })

  it('Should pass generics types to chained handlers', () => {
    type Bindings = {
      MY_VAR_IN_BINDINGS: string
    }

    type Variables = {
      MY_VAR: string
    }

    const app = new Hono<{ Bindings: Bindings }>()

    app.get(
      '/',
      createMiddleware<{ Variables: Variables }>(async (c, next) => {
        await next()
      }),
      createMiddleware(async (c, next) => {
        await next()
      }),
      async (c) => {
        const v = c.get('MY_VAR')
        expectTypeOf(v).toEqualTypeOf<string>()
      }
    )
  })
})

describe('createHandler', () => {
  const mw = (message: string) =>
    createMiddleware(async (c, next) => {
      await next()
      c.header('x-message', message)
    })

  describe('Basic', () => {
    const factory = createFactory()
    const app = new Hono()

    const handlersA = factory.createHandlers((c) => {
      return c.text('A')
    })
    const routesA = app.get('/a', ...handlersA)

    const handlersB = factory.createHandlers(mw('B'), (c) => {
      return c.text('B')
    })
    app.get('/b', ...handlersB)

    it('Should return 200 response - GET /a', async () => {
      const res = await app.request('/a')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('A')
    })

    it('Should return 200 response with a custom header - GET /b', async () => {
      const res = await app.request('/b')
      expect(res.status).toBe(200)
      expect(res.headers.get('x-message')).toBe('B')
      expect(await res.text()).toBe('B')
    })

    it('Should return correct path types - /a', () => {
      const client = hc<typeof routesA>('/')
      expectTypeOf(client).toEqualTypeOf<{
        a: ClientRequest<{
          $get: {
            input: {}
            output: 'A'
            outputFormat: 'text'
            status: ContentfulStatusCode
          }
        }>
      }>()
    })
  })

  describe('Types', () => {
    type Env = { Variables: { foo: string } }

    const factory = createFactory<Env>()
    const app = new Hono<Env>()

    const handlers = factory.createHandlers(
      validator('query', () => {
        return {
          page: '1',
        }
      }),
      (c) => {
        const foo = c.var.foo
        const { page } = c.req.valid('query')
        return c.json({ page, foo })
      }
    )
    const routes = app.get('/posts', ...handlers)

    type Expected = Hono<
      Env,
      ToSchema<
        'get',
        '/posts',
        {
          in: {
            query: {
              page: string
            }
          }
        },
        TypedResponse<{
          page: string
          foo: string
        }>
      >,
      '/'
    >

    it('Should return correct types', () => {
      expectTypeOf(routes).toEqualTypeOf<Expected>()
    })
  })

  // It's difficult to cover all possible patterns,
  // so these tests will only cover the minimal cases.

  describe('Types - Complex', () => {
    type Env = { Variables: { foo: string } }

    const factory = createFactory<Env>()
    const app = new Hono<Env>()

    const handlers = factory.createHandlers(
      validator('header', () => {
        return {
          auth: 'token',
        }
      }),
      validator('query', () => {
        return {
          page: '1',
        }
      }),
      validator('json', () => {
        return {
          id: 123,
        }
      }),
      (c) => {
        const foo = c.var.foo
        const { auth } = c.req.valid('header')
        const { page } = c.req.valid('query')
        const { id } = c.req.valid('json')
        return c.json({ auth, page, foo, id })
      }
    )
    const routes = app.get('/posts', ...handlers)

    type Expected = Hono<
      Env,
      ToSchema<
        'get',
        '/posts',
        {
          in: {
            header: {
              auth: string
            }
          } & {
            query: {
              page: string
            }
          } & {
            json: {
              id: number
            }
          }
        },
        TypedResponse<{
          auth: string
          page: string
          foo: string
          id: number
        }>
      >,
      '/'
    >

    it('Should return correct types', () => {
      expectTypeOf(routes).toEqualTypeOf<Expected>()
    })
  })

  describe('Types - Context Env with Multiple Middlewares', () => {
    const factory = createFactory()

    const mw1 = createMiddleware<
      { Variables: { foo1: string } },
      string,
      { out: { query: { bar1: number } } }
    >(async () => {})
    const mw2 = createMiddleware<
      { Variables: { foo2: string } },
      string,
      { out: { query: { bar2: number } } }
    >(async () => {})
    const mw3 = createMiddleware<
      { Variables: { foo3: string } },
      string,
      { out: { query: { bar3: number } } }
    >(async () => {})
    const mw4 = createMiddleware<
      { Variables: { foo4: string } },
      string,
      { out: { query: { bar4: number } } }
    >(async () => {})
    const mw5 = createMiddleware<
      { Variables: { foo5: string } },
      string,
      { out: { query: { bar5: number } } }
    >(async () => {})
    const mw6 = createMiddleware<
      { Variables: { foo6: string } },
      string,
      { out: { query: { bar6: number } } }
    >(async () => {})
    const mw7 = createMiddleware<
      { Variables: { foo7: string } },
      string,
      { out: { query: { bar7: number } } }
    >(async () => {})
    const mw8 = createMiddleware<
      { Variables: { foo8: string } },
      string,
      { out: { query: { bar8: number } } }
    >(async () => {})
    const mw9 = createMiddleware<
      { Variables: { foo9: string } },
      string,
      { out: { query: { bar9: number } } }
    >(async () => {})

    it('Should not throw type error', () => {
      factory.createHandlers(
        mw1,
        mw2,
        mw3,
        mw4,
        mw5,
        mw6,
        mw7,
        mw8,
        async (c) => {
          expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
          expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
          expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
          expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
          expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
          expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
          expectTypeOf(c.var.foo7).toEqualTypeOf<string>()
          expectTypeOf(c.var.foo8).toEqualTypeOf<string>()
        },
        (c) => c.json(0)
      )

      factory.createHandlers(mw1, mw2, mw3, mw4, mw5, mw6, mw7, mw8, mw9, (c) => {
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo7).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo8).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo9).toEqualTypeOf<string>()

        return c.json({
          foo1: c.get('foo1'),
          foo2: c.get('foo2'),
          foo3: c.get('foo3'),
          foo4: c.get('foo4'),
          foo5: c.get('foo5'),
          foo6: c.get('foo6'),
          foo7: c.get('foo7'),
          foo8: c.get('foo8'),
          foo9: c.get('foo9'),
        })
      })
    })
  })
})

describe('createFactory', () => {
  describe('createApp', () => {
    type Env = { Variables: { foo: string } }
    const factory = createFactory<Env>({
      initApp: (app) => {
        app.use((c, next) => {
          c.set('foo', 'bar')
          return next()
        })
      },
    })
    const app = factory.createApp()
    it('Should set the correct type and initialize the app', async () => {
      app.get('/', (c) => {
        expectTypeOf(c.var.foo).toEqualTypeOf<string>()
        return c.text(c.var.foo)
      })
      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('bar')
    })
  })

  describe('createMiddleware', () => {
    it('Should set the correct type', () => {
      const factory = createFactory()

      const middleware = factory.createMiddleware(async (_, next) => {
        await next()
      })

      const routes = new Hono().use('*', middleware)
      type Actual = ExtractSchema<typeof routes>
      type Expected = {
        '*': {}
      }
      type verify = Expect<Equal<Expected, Actual>>
    })
  })

  it('Should use the default app options', async () => {
    const app = createFactory({ defaultAppOptions: { strict: false } }).createApp()
    app.get('/hello', (c) => c.text('hello'))
    const res = await app.request('/hello/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })

  it('Should override the default app options when creating', async () => {
    const app = createFactory({ defaultAppOptions: { strict: true } }).createApp({ strict: false })
    app.get('/hello', (c) => c.text('hello'))
    const res = await app.request('/hello/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })
})

describe('Lint rules', () => {
  it('Should not throw a eslint `unbound-method` error if destructed', () => {
    const { createApp, createHandlers, createMiddleware } = createFactory()
    expect(createApp).toBeDefined()
    expect(createHandlers).toBeDefined()
    expect(createMiddleware).toBeDefined()
  })
})
