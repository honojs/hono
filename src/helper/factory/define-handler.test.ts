import { expectTypeOf } from 'vitest'
import * as z from 'zod/v4'
import { createFactory, defineMiddleware } from '.'
import { hc } from '../../client'
import type { InferResponseType } from '../../client'
import type { Context } from '../../context'
import { Hono } from '../../hono'
import type { HTTPException } from '../../http-exception'
import { jsx } from '../../jsx'
import { html } from '../html'
import { defineHandler } from './define-handler'
import type { StandardSchema } from './define-handler'

type Issue = { message: string; path?: PropertyKey[] }

const schema = <Input, Output = Input>(
  validate: (
    value: unknown
  ) =>
    | { value: Output; issues?: undefined }
    | { issues: Issue[] }
    | Promise<{ value: Output; issues?: undefined } | { issues: Issue[] }>
): StandardSchema<Input, Output> => ({
  '~standard': { validate: validate as never },
})

const idSchema = schema<{ id: string }>((value) => {
  const id = (value as { id?: unknown }).id
  return typeof id === 'string' && /^\d+$/.test(id)
    ? { value: { id } }
    : { issues: [{ message: 'id must be digits', path: ['id'] }] }
})

const post = (path: string, body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  path,
})

describe('defineHandler', () => {
  describe('request validation', () => {
    const app = new Hono()

    app.post(
      '/users/:id',
      defineHandler({
        param: z.object({ id: z.string() }),
        query: z.object({ page: z.coerce.number() }),
        json: z.object({ name: z.string() }),
      })((c, { param, query, json }) => {
        expectTypeOf(param).toEqualTypeOf<{ id: string }>()
        expectTypeOf(query).toEqualTypeOf<{ page: number }>()
        expectTypeOf(json).toEqualTypeOf<{ name: string }>()
        expectTypeOf(c.req.valid('json')).toEqualTypeOf<{ name: string }>()
        return { id: param.id, page: query.page, name: json.name }
      })
    )

    it('Should validate multiple targets and pass them to the handler', async () => {
      const { path, ...init } = post('/users/123?page=2', { name: 'Yusuke' })
      const res = await app.request(path, init)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ id: '123', page: 2, name: 'Yusuke' })
    })

    it('Should return 400 with the issues of every failed target', async () => {
      const { path, ...init } = post('/users/123?page=x', { name: 1 })
      const res = await app.request(path, init)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Validation failed')
      expect(body.issues.map((f: { slot: string }) => f.slot)).toEqual(['query', 'json'])
      expect(body.issues[1].issues[0].path).toBe('name')
    })

    it('Should keep the malformed JSON behavior of validator()', async () => {
      const res = await app.request('/users/123?page=2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      })
      expect(res.status).toBe(400)
      expect(await res.text()).toBe('Malformed JSON in request body')
    })
  })

  describe('validation inputs', () => {
    it('Should accept a minimal Standard Schema without a library', async () => {
      const app = new Hono()
      app.get(
        '/users/:id',
        defineHandler({ param: idSchema })((_, { param }) => {
          expectTypeOf(param).toEqualTypeOf<{ id: string }>()
          return { id: param.id }
        })
      )
      expect(await (await app.request('/users/1')).json()).toEqual({ id: '1' })
      const res = await app.request('/users/x')
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({
        error: 'Validation failed',
        issues: [{ slot: 'param', issues: [{ message: 'id must be digits', path: 'id' }] }],
      })
    })

    it('Should validate with a callable Standard Schema at runtime', async () => {
      // A callable schema (e.g. ArkType) is validated through `~standard`,
      // but its types come from the call signature
      const callable = Object.assign((value: unknown) => value as { id: string }, idSchema)
      const app = new Hono()
      app.get(
        '/users/:id',
        defineHandler({ param: callable })((_, { param }) => ({ id: param.id }))
      )
      expect((await app.request('/users/x')).status).toBe(400)
      expect(await (await app.request('/users/1')).json()).toEqual({ id: '1' })
    })

    it('Should accept validation functions for the request and the response', async () => {
      const app = new Hono()
      app.get(
        '/users/:id',
        defineHandler({
          param: (value, c) => {
            if (!/^\d+$/.test(value.id)) {
              return c.text('Invalid id', 422)
            }
            return { id: Number(value.id) }
          },
          response: (value: { id: number }) => ({ ...value, checked: true }),
        })((_, { param }) => {
          expectTypeOf(param).toEqualTypeOf<{ id: number }>()
          return { id: param.id }
        })
      )
      expect(await (await app.request('/users/1')).json()).toEqual({ id: 1, checked: true })
      const res = await app.request('/users/x')
      expect(res.status).toBe(422)
      expect(await res.text()).toBe('Invalid id')
    })

    it('Should await async validation', async () => {
      const asyncSchema = schema<{ q: string }>(async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return { value: value as { q: string } }
      })
      const app = new Hono()
      app.get(
        '/search',
        defineHandler({
          query: asyncSchema,
          response: schema<{ q: string }, { q: string; async: true }>(async (value) => ({
            value: { ...(value as { q: string }), async: true },
          })),
        })((_, { query }) => ({ q: query.q }))
      )
      expect(await (await app.request('/search?q=hono')).json()).toEqual({ q: 'hono', async: true })
    })
  })

  describe('response validation', () => {
    const app = new Hono()

    app.get(
      '/users/:id',
      defineHandler({
        param: z.object({ id: z.string() }),
        response: z.object({ id: z.string(), name: z.string().default('anonymous') }),
      })((c, { param: { id } }) => {
        if (id === 'redirect') {
          return c.redirect('/')
        }
        if (id === 'broken') {
          return { id: 1 } as unknown as { id: string }
        }
        return { id, secret: 'not in the schema' }
      })
    )

    it('Should validate and transform the returned value', async () => {
      const res = await app.request('/users/1')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toMatch(/^application\/json/)
      expect(await res.json()).toEqual({ id: '1', name: 'anonymous' })
    })

    it('Should return 500 without the issues for an invalid response', async () => {
      const res = await app.request('/users/broken')
      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'Response validation failed' })
    })

    it('Should pass an invalid response to onError as an HTTPException', async () => {
      const app = new Hono()
      app.get(
        '/',
        defineHandler({ response: z.object({ id: z.string() }) })(
          () => ({ id: 1 }) as unknown as { id: string }
        )
      )
      const onError = vi.fn((err: Error, c: Context) => {
        const { issues } = (err as HTTPException).cause as {
          issues: { slot: string; issues: unknown[] }[]
        }
        return c.text(
          `${(err as HTTPException).status}:${issues[0].slot}:${issues[0].issues.length}`
        )
      })
      app.onError(onError)
      const res = await app.request('/')
      expect(onError).toHaveBeenCalledOnce()
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('500:response:1')
    })

    it('Should pass an invalid request to onError as an HTTPException', async () => {
      const app = new Hono()
      app.post(
        '/',
        defineHandler({ json: z.object({ name: z.string() }) })(() => ({ ok: true }))
      )
      app.onError((err, c) => {
        const { issues } = (err as HTTPException).cause as { issues: { slot: string }[] }
        return c.json({ message: 'invalid', slot: issues[0].slot }, 400)
      })
      const { path, ...init } = post('/', { name: 1 })
      const res = await app.request(path, init)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ message: 'invalid', slot: 'json' })
    })

    it('Should not include the input value in the default failure response', async () => {
      const leaky = schema<{ token: string }>((value) => ({
        issues: [
          {
            message: 'invalid',
            path: [{ key: 'token', input: value, value: (value as { token: string }).token }],
            input: value,
          } as never,
        ],
      }))
      const app = new Hono()
      app.get(
        '/',
        defineHandler({ header: leaky })(() => ({ ok: true }))
      )
      const res = await app.request('/', { headers: { token: 'secret' } })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({
        error: 'Validation failed',
        issues: [{ slot: 'header', issues: [{ message: 'invalid', path: 'token' }] }],
      })
    })

    it('Should return a Response from the handler as is', async () => {
      const res = await app.request('/users/redirect')
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/')
    })

    it('Should keep the headers set by c.header()', async () => {
      const app = new Hono()
      app.get(
        '/',
        defineHandler({ response: z.object({ id: z.string() }) })((c) => {
          c.header('X-Custom', 'custom')
          return { id: '1' }
        })
      )
      app.get(
        '/broken',
        defineHandler({ response: z.object({ id: z.string() }) })((c) => {
          c.header('X-Custom', 'custom')
          return { id: 1 } as unknown as { id: string }
        })
      )
      const res = await app.request('/')
      expect(res.headers.get('X-Custom')).toBe('custom')
      expect(await res.json()).toEqual({ id: '1' })
      const broken = await app.request('/broken')
      expect(broken.status).toBe(500)
      expect(broken.headers.get('X-Custom')).toBe('custom')
    })

    it('Should use the status set by c.status()', async () => {
      const app = new Hono()
      app.post(
        '/users',
        defineHandler({ response: z.object({ id: z.string() }) })((c) => {
          c.status(201)
          return { id: '1' }
        })
      )
      const res = await app.request('/users', { method: 'POST' })
      expect(res.status).toBe(201)
      expect(await res.json()).toEqual({ id: '1' })
    })
  })

  describe('return values without response validation', () => {
    const app = new Hono()
      .get(
        '/json',
        defineHandler({})(() => ({ ok: true }))
      )
      .get(
        '/html',
        defineHandler({})(() => '<h1>Hi</h1>')
      )
      .get(
        '/jsx',
        defineHandler({})(() => jsx('h1', null, 'Hi <JSX>'))
      )
      .get(
        '/template',
        defineHandler({})(() => html`<h1>${'Hi <html>'}</h1>`)
      )
      .get(
        '/empty',
        defineHandler({})(() => null)
      )
      .get(
        '/response',
        defineHandler({})((c) => c.text('text', 202))
      )

    it('Should return an object as JSON', async () => {
      const res = await app.request('/json')
      expect(res.headers.get('Content-Type')).toMatch(/^application\/json/)
      expect(await res.json()).toEqual({ ok: true })
    })

    it('Should return a string as HTML', async () => {
      const res = await app.request('/html')
      expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
      expect(await res.text()).toBe('<h1>Hi</h1>')
    })

    it('Should return JSX and an html template as HTML', async () => {
      const res = await app.request('/jsx')
      expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
      expect(await res.text()).toBe('<h1>Hi &lt;JSX&gt;</h1>')
      const template = await app.request('/template')
      expect(template.headers.get('Content-Type')).toMatch(/^text\/html/)
      expect(await template.text()).toBe('<h1>Hi &lt;html&gt;</h1>')
    })

    it('Should return 204 for null', async () => {
      const res = await app.request('/empty')
      expect(res.status).toBe(204)
      expect(res.body).toBe(null)
    })

    it('Should return a Response as is', async () => {
      const res = await app.request('/response')
      expect(res.status).toBe(202)
      expect(await res.text()).toBe('text')
    })
  })

  describe('defineHandler(handler)', () => {
    const app = new Hono()
      .get(
        '/json',
        defineHandler(() => ({ ok: true }))
      )
      .get(
        '/html',
        defineHandler(() => '<h1>Hi</h1>')
      )
      .get(
        '/jsx',
        defineHandler(() => jsx('h1', null, 'Hi'))
      )
      .get(
        '/empty',
        defineHandler(() => undefined)
      )
      .get(
        '/response',
        defineHandler((c) => c.text('text', 202))
      )
      .get(
        '/async',
        defineHandler(async () => ({ ok: true }))
      )

    it('Should convert the returned value to a Response', async () => {
      expect(await (await app.request('/json')).json()).toEqual({ ok: true })
      expect((await app.request('/html')).headers.get('Content-Type')).toMatch(/^text\/html/)
      expect(await (await app.request('/jsx')).text()).toBe('<h1>Hi</h1>')
      expect((await app.request('/empty')).status).toBe(204)
      expect((await app.request('/response')).status).toBe(202)
      expect(await (await app.request('/async')).json()).toEqual({ ok: true })
    })

    it('Should type the context with the given Env and path', () => {
      defineHandler<{ Variables: { user: string } }, '/me/:id'>((c) => {
        expectTypeOf(c.get('user')).toEqualTypeOf<string>()
        expectTypeOf(c.req.param('id')).toEqualTypeOf<string>()
        return {}
      })
    })

    it('Should run middleware before the handler, with its Env', async () => {
      type AuthEnv = { Variables: { userId: string } }
      const requireAuth = defineMiddleware<AuthEnv>(async (c, next) => {
        c.set('userId', 'u1')
        await next()
      })
      const after = defineMiddleware(async (c, next) => {
        await next()
        c.header('X-After', 'yes')
      })
      const app = new Hono().get(
        '/me',
        defineHandler(requireAuth, after, (c) => {
          expectTypeOf(c.get('userId')).toEqualTypeOf<string>()
          return { id: c.get('userId') }
        })
      )
      const res = await app.request('/me')
      expect(res.headers.get('X-After')).toBe('yes')
      expect(await res.json()).toEqual({ id: 'u1' })
    })

    it('Should infer the returned value in the RPC types', () => {
      const plain = new Hono().get('/', () => new Response('text'))
      type PlainBody = InferResponseType<ReturnType<typeof hc<typeof plain>>['index']['$get']>
      const client = hc<typeof app>('http://localhost')
      expectTypeOf<InferResponseType<typeof client.json.$get>>().toEqualTypeOf<{
        ok: boolean
      }>()
      expectTypeOf<InferResponseType<typeof client.html.$get>>().toEqualTypeOf<PlainBody>()
      expectTypeOf<InferResponseType<typeof client.jsx.$get>>().toEqualTypeOf<PlainBody>()
      expectTypeOf<InferResponseType<typeof client.empty.$get>>().toEqualTypeOf<null>()
      expectTypeOf<InferResponseType<typeof client.response.$get>>().toBeString()
    })
  })

  describe('createFactory().defineHandler', () => {
    type MyEnv = { Variables: { user: { name: string } } }
    const factory = createFactory<MyEnv, '/me/:id'>()

    it('Should type the context with the Env of the factory', async () => {
      const app = new Hono<MyEnv>()
      app.use(async (c, next) => {
        c.set('user', { name: 'yusuke' })
        await next()
      })
      app.get(
        '/me/:id',
        factory.defineHandler({ query: z.object({ q: z.string().optional() }) })((c, { query }) => {
          expectTypeOf(c.get('user')).toEqualTypeOf<{ name: string }>()
          expectTypeOf(c.req.param('id')).toEqualTypeOf<string>()
          expectTypeOf(query).toEqualTypeOf<{ q?: string | undefined }>()
          return { name: c.get('user').name, id: c.req.param('id') }
        })
      )
      app.get(
        '/me/:id/plain',
        factory.defineHandler((c) => {
          expectTypeOf(c.get('user')).toEqualTypeOf<{ name: string }>()
          return c.get('user')
        })
      )
      expect(await (await app.request('/me/42?q=x')).json()).toEqual({ name: 'yusuke', id: '42' })
      expect(await (await app.request('/me/42/plain')).json()).toEqual({ name: 'yusuke' })
    })

    it('Should define a middleware with the Env of the factory', async () => {
      const setUser = factory.defineMiddleware(async (c, next) => {
        c.set('user', { name: 'factory' })
        await next()
      })
      const app = new Hono<MyEnv>().get('/', setUser, (c) => c.json(c.get('user')))
      expect(await (await app.request('/')).json()).toEqual({ name: 'factory' })
    })
  })

  describe('typed context', () => {
    type MyEnv = { Variables: { user: { name: string } } }

    it('Should type the context with the given Env and path', async () => {
      const app = new Hono<MyEnv>()
      app.use(async (c, next) => {
        c.set('user', { name: 'yusuke' })
        await next()
      })
      app.get(
        '/me/:id',
        defineHandler({
          query: z.object({ q: z.string().optional() }),
          response: z.object({ name: z.string(), id: z.string() }),
        })<MyEnv, '/me/:id'>((c, { query }) => {
          expectTypeOf(c.get('user')).toEqualTypeOf<{ name: string }>()
          expectTypeOf(c.req.param('id')).toEqualTypeOf<string>()
          expectTypeOf(query).toEqualTypeOf<{ q?: string | undefined }>()
          return { name: c.get('user').name, id: c.req.param('id') }
        })
      )
      const res = await app.request('/me/42?q=x')
      expect(await res.json()).toEqual({ name: 'yusuke', id: '42' })
    })
  })

  describe('middleware', () => {
    type AuthEnv = { Variables: { userId: string } }
    const requireAuth = defineMiddleware<AuthEnv>(async (c, next) => {
      c.set('userId', 'u1')
      await next()
    })

    it('Should type c.get() with the Env of the middleware', async () => {
      const app = new Hono().get(
        '/me',
        defineHandler({ response: z.object({ id: z.string() }) })(requireAuth, (c) => {
          expectTypeOf(c.get('userId')).toEqualTypeOf<string>()
          // @ts-expect-error not in the Env
          c.get('foo')
          return { id: c.get('userId') }
        })
      )
      const res = await app.request('/me')
      expect(await res.json()).toEqual({ id: 'u1' })
    })

    it('Should intersect the Envs of multiple middleware and the given Env', () => {
      const withRole = defineMiddleware<{ Variables: { role: 'admin' | 'member' } }>(
        async (c, next) => {
          c.set('role', 'admin')
          await next()
        }
      )
      const factory = createFactory<{ Bindings: { KV: string } }>()
      factory.defineHandler(requireAuth, withRole, (c) => {
        expectTypeOf(c.get('userId')).toEqualTypeOf<string>()
        expectTypeOf(c.get('role')).toEqualTypeOf<'admin' | 'member'>()
        expectTypeOf(c.env.KV).toEqualTypeOf<string>()
        return {}
      })
      factory.defineHandler({})(requireAuth, withRole, (c) => {
        expectTypeOf(c.get('userId')).toEqualTypeOf<string>()
        expectTypeOf(c.get('role')).toEqualTypeOf<'admin' | 'member'>()
        expectTypeOf(c.env.KV).toEqualTypeOf<string>()
        return {}
      })
    })

    it('Should not validate the request when the middleware returns a response', async () => {
      const order: string[] = []
      const deny = defineMiddleware(async (c) => {
        order.push('deny')
        return c.json({ message: 'Unauthorized' }, 401)
      })
      const app = new Hono().post(
        '/',
        defineHandler({
          json: (v) => {
            order.push('validate')
            return v
          },
        })(deny, () => {
          order.push('handle')
          return {}
        })
      )
      const res = await app.request('/', { method: 'POST' })
      expect(res.status).toBe(401)
      expect(order).toEqual(['deny'])
    })

    it('Should run middleware, request validation, the handler, and response validation in order', async () => {
      const order: string[] = []
      const log = defineMiddleware(async (c, next) => {
        order.push('middleware:before')
        await next()
        order.push('middleware:after')
        c.header('X-After', 'yes')
      })
      const app = new Hono().post(
        '/',
        defineHandler({
          query: (v) => {
            order.push('query')
            return v
          },
          response: (v: { ok: boolean }) => {
            order.push('response')
            return v
          },
        })(log, () => {
          order.push('handle')
          return { ok: true }
        })
      )
      const res = await app.request('/', { method: 'POST' })
      expect(order).toEqual([
        'middleware:before',
        'query',
        'handle',
        'response',
        'middleware:after',
      ])
      expect(res.headers.get('X-After')).toBe('yes')
      expect(await res.json()).toEqual({ ok: true })
    })
  })

  describe('RPC types', () => {
    const app = new Hono().post(
      '/users/:id',
      defineHandler({
        param: z.object({ id: z.string() }),
        json: z.object({ name: z.string() }),
        response: z.object({ id: z.string(), name: z.string() }),
      })((_, { param, json }) => ({ id: param.id, name: json.name }))
    )
    const client = hc<typeof app>('http://localhost')
    const route = client.users[':id'].$post

    it('Should infer the request input', () => {
      expectTypeOf<Parameters<typeof route>[0]>().toEqualTypeOf<{
        param: { id: string }
        json: { name: string }
      }>()
    })

    it('Should infer the validated response, without the failure responses', () => {
      expectTypeOf<InferResponseType<typeof route>>().toEqualTypeOf<{ id: string; name: string }>()
      expectTypeOf<InferResponseType<typeof route, 200>>().toEqualTypeOf<{
        id: string
        name: string
      }>()
    })

    it('Should infer the returned value without a response schema', () => {
      const app = new Hono()
        .get(
          '/',
          defineHandler({ query: z.object({ page: z.coerce.number() }) })((_, { query }) => ({
            page: query.page,
          }))
        )
        .get(
          '/union',
          defineHandler({})((c) => (Math.random() > 0.5 ? c.json({ ok: true }, 201) : { id: '1' }))
        )
        .get(
          '/none',
          defineHandler({})(() => null)
        )
      const client = hc<typeof app>('http://localhost')
      expectTypeOf<InferResponseType<typeof client.index.$get>>().toEqualTypeOf<{ page: number }>()
      expectTypeOf<InferResponseType<typeof client.union.$get>>().toEqualTypeOf<
        { ok: true } | { id: string }
      >()
      expectTypeOf<InferResponseType<typeof client.none.$get>>().toEqualTypeOf<null>()
    })

    it('Should only accept the response input type or a non-JSON Response from the handler', () => {
      const withResponse = defineHandler({ response: z.object({ id: z.string() }) })
      withResponse((c) => (Math.random() > 0.5 ? c.redirect('/') : { id: '1' }))
      // @ts-expect-error `id` must be a string
      withResponse(() => ({ id: 1 }))
      // @ts-expect-error `c.json()` would bypass the response validation
      withResponse((c) => c.json({ id: 1 }))
      // Without `response`, `c.json()` is accepted
      defineHandler({})((c) => c.json({ id: 1 }))
    })
  })
})
