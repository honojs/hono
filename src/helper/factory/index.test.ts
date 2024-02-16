import { expectTypeOf } from 'vitest'
import { hc } from '../../client'
import type { ClientRequest } from '../../client/types'
import { Hono } from '../../index'
import type { ToSchema } from '../../types'
import { validator } from '../../validator'
import { createMiddleware, createFactory } from './index'

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
            output: {}
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
        },
        {
          auth: string
          page: string
          foo: string
          id: number
        }
      >,
      '/'
    >

    it('Should return correct types', () => {
      expectTypeOf(routes).toEqualTypeOf<Expected>()
    })
  })
})
