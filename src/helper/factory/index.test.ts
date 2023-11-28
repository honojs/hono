import { expectTypeOf } from 'vitest'
import { hc } from '../../client'
import { Hono } from '../../index'
import type { ExtractSchema, ToSchema } from '../../types'
import { validator } from '../../validator'
import { createMiddleware, createFactory } from './index'

describe('createMiddleware', () => {
  type Env = { Variables: { foo: string } }
  const app = new Hono<Env>()

  const mw = (message: string) =>
    createMiddleware<Env>(async (c, next) => {
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
})

// A fake function for testing types.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractSchema<T = unknown>(_: T): ExtractSchema<T> {
  return true as ExtractSchema<T>
}

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
    app.get('/a', ...handlersA)

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
  })

  describe('Types', () => {
    type Env = { Variables: { foo: string } }

    const factory = createFactory<Env>()
    const app = new Hono<Env>()

    const handlersA = factory.createHandlers(
      validator('query', () => {
        return {
          page: '1',
        }
      }),
      (c) => {
        const foo = c.var.foo
        const { page } = c.req.valid('query')
        return c.jsonT({ page, foo })
      }
    )
    const routesA = app.get('/posts', ...handlersA)

    type ExpectedA = {
      '/posts': {
        $get: {
          input: {
            query: {
              page: string
            }
          }
          output: {
            foo: string
            page: string
          }
        }
      }
    }

    it('Should return correct types', () => {
      expectTypeOf(routesA).toEqualTypeOf<
        Hono<
          Env,
          ToSchema<
            'get',
            '/posts',
            {
              query: {
                page: string
              }
            },
            {
              page: string
              foo: string
            }
          >,
          '/'
        >
      >()
    })
  })

  // It's difficult to cover all possible patterns,
  // so these tests will only cover the minimal cases.

  describe('Types - Complex', () => {
    type Env = { Variables: { foo: string } }

    const factory = createFactory<Env>()
    const app = new Hono<Env>()

    const handlersA = factory.createHandlers(
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
        return c.jsonT({ auth, page, foo, id })
      }
    )
    const routesA = app.get('/posts', ...handlersA)

    type ExpectedA = {
      '/posts': {
        $get: {
          input: {
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
          output: {
            auth: string
            page: string
            foo: string
            id: number
          }
        }
      }
    }

    it('Should return correct types', () => {
      expectTypeOf(extractSchema(routesA)).toEqualTypeOf<ExpectedA>()
    })
  })
})
