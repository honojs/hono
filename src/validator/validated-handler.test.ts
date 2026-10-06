import { expectTypeOf } from 'vitest'
import * as z from 'zod/v4'
import { hc } from '../client'
import type { InferResponseType } from '../client'
import type { Context } from '../context'
import { Hono } from '../hono'
import type { HTTPException } from '../http-exception'
import { validatedHandler } from './validated-handler'
import type { StandardSchema } from './validated-handler'

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

describe('validatedHandler', () => {
  describe('request validation', () => {
    const app = new Hono()

    app.post(
      '/users/:id',
      validatedHandler({
        param: z.object({ id: z.string() }),
        query: z.object({ page: z.coerce.number() }),
        json: z.object({ name: z.string() }),
        handle: (c) => {
          const param = c.req.valid('param')
          const query = c.req.valid('query')
          const json = c.req.valid('json')
          expectTypeOf(param).toEqualTypeOf<{ id: string }>()
          expectTypeOf(query).toEqualTypeOf<{ page: number }>()
          expectTypeOf(json).toEqualTypeOf<{ name: string }>()
          return { id: param.id, page: query.page, name: json.name }
        },
      })
    )

    it('Should validate multiple targets and make them available via c.req.valid()', async () => {
      const res = await app.request('/users/123?page=2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Yusuke' }),
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ id: '123', page: 2, name: 'Yusuke' })
    })

    it('Should return 400 with the issues for an invalid request', async () => {
      const res = await app.request('/users/123?page=2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 1 }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.target).toBe('json')
      expect(body.error[0].path).toEqual(['name'])
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
        validatedHandler({
          param: idSchema,
          handle: (c) => {
            expectTypeOf(c.req.valid('param')).toEqualTypeOf<{ id: string }>()
            return { id: c.req.valid('param').id }
          },
        })
      )
      expect(await (await app.request('/users/1')).json()).toEqual({ id: '1' })
      const res = await app.request('/users/x')
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({
        success: false,
        target: 'param',
        error: [{ message: 'id must be digits', path: ['id'] }],
      })
    })

    it('Should validate with a callable Standard Schema at runtime', async () => {
      // A callable schema (e.g. ArkType) is validated through `~standard`,
      // but its types come from the call signature
      const callable = Object.assign((value: unknown) => value as { id: string }, idSchema)
      const app = new Hono()
      app.get(
        '/users/:id',
        validatedHandler({
          param: callable,
          handle: (c) => ({ id: c.req.valid('param').id }),
        })
      )
      expect((await app.request('/users/x')).status).toBe(400)
      expect(await (await app.request('/users/1')).json()).toEqual({ id: '1' })
    })

    it('Should accept validation functions for the request and the response', async () => {
      const app = new Hono()
      app.get(
        '/users/:id',
        validatedHandler({
          param: (value, c) => {
            if (!/^\d+$/.test(value.id)) {
              return c.text('Invalid id', 422)
            }
            return { id: Number(value.id) }
          },
          response: (value: { id: number }) => ({ ...value, checked: true }),
          handle: (c) => {
            expectTypeOf(c.req.valid('param')).toEqualTypeOf<{ id: number }>()
            return { id: c.req.valid('param').id }
          },
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
        validatedHandler({
          query: asyncSchema,
          response: schema<{ q: string }, { q: string; async: true }>(async (value) => ({
            value: { ...(value as { q: string }), async: true },
          })),
          handle: (c) => ({ q: c.req.valid('query').q }),
        })
      )
      expect(await (await app.request('/search?q=hono')).json()).toEqual({ q: 'hono', async: true })
    })
  })

  describe('response validation', () => {
    const app = new Hono()

    app.get(
      '/users/:id',
      validatedHandler({
        param: z.object({ id: z.string() }),
        response: z.object({ id: z.string(), name: z.string().default('anonymous') }),
        handle: (c) => {
          const { id } = c.req.valid('param')
          if (id === 'redirect') {
            return c.redirect('/')
          }
          if (id === 'broken') {
            return { id: 1 } as unknown as { id: string }
          }
          return { id, secret: 'not in the schema' }
        },
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
      expect(await res.json()).toEqual({ success: false, target: 'response' })
    })

    it('Should pass an invalid response to onError as an HTTPException', async () => {
      const app = new Hono()
      app.get(
        '/',
        validatedHandler({
          response: z.object({ id: z.string() }),
          handle: () => ({ id: 1 }) as unknown as { id: string },
        })
      )
      const onError = vi.fn((err: Error, c: Context) => {
        const cause = (err as HTTPException).cause as { target: string; issues: unknown[] }
        return c.text(`${(err as HTTPException).status}:${cause.target}:${cause.issues.length}`)
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
        validatedHandler({
          json: z.object({ name: z.string() }),
          handle: () => ({ ok: true }),
        })
      )
      app.onError((err, c) => {
        const cause = (err as HTTPException).cause as { target: string }
        return c.json({ message: 'invalid', target: cause.target }, 400)
      })
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 1 }),
      })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ message: 'invalid', target: 'json' })
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
        validatedHandler({
          header: leaky,
          handle: () => ({ ok: true }),
        })
      )
      const res = await app.request('/', { headers: { token: 'secret' } })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({
        success: false,
        target: 'header',
        error: [{ message: 'invalid', path: ['token'] }],
      })
    })

    it('Should return a Response from handle as is', async () => {
      const res = await app.request('/users/redirect')
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/')
    })

    it('Should keep the headers set by c.header()', async () => {
      const app = new Hono()
      app.get(
        '/',
        validatedHandler({
          response: z.object({ id: z.string() }),
          handle: (c) => {
            c.header('X-Custom', 'custom')
            return { id: '1' }
          },
        })
      )
      app.get(
        '/broken',
        validatedHandler({
          response: z.object({ id: z.string() }),
          handle: (c) => {
            c.header('X-Custom', 'custom')
            return { id: 1 } as unknown as { id: string }
          },
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
        validatedHandler({
          response: z.object({ id: z.string() }),
          handle: (c) => {
            c.status(201)
            return { id: '1' }
          },
        })
      )
      const res = await app.request('/users', { method: 'POST' })
      expect(res.status).toBe(201)
      expect(await res.json()).toEqual({ id: '1' })
    })

    it('Should return the value as JSON without response validation', async () => {
      const app = new Hono()
      app.get(
        '/',
        validatedHandler({
          handle: () => ({ ok: true }),
        })
      )
      expect(await (await app.request('/')).json()).toEqual({ ok: true })
    })
  })

  describe('validatedHandler<Env, Path>()', () => {
    type MyEnv = { Variables: { user: { name: string } } }

    it('Should type the context with the given Env and path', async () => {
      const app = new Hono<MyEnv>()
      app.use(async (c, next) => {
        c.set('user', { name: 'yusuke' })
        await next()
      })
      app.get(
        '/me/:id',
        validatedHandler<MyEnv, '/me/:id'>()({
          query: z.object({ q: z.string().optional() }),
          response: z.object({ name: z.string(), id: z.string() }),
          handle: (c) => {
            expectTypeOf(c.get('user')).toEqualTypeOf<{ name: string }>()
            expectTypeOf(c.req.param('id')).toEqualTypeOf<string>()
            expectTypeOf(c.req.valid('query')).toEqualTypeOf<{ q?: string | undefined }>()
            return { name: c.get('user').name, id: c.req.param('id') }
          },
        })
      )
      const res = await app.request('/me/42?q=x')
      expect(await res.json()).toEqual({ name: 'yusuke', id: '42' })
    })
  })

  describe('RPC types', () => {
    const app = new Hono().post(
      '/users/:id',
      validatedHandler({
        param: z.object({ id: z.string() }),
        json: z.object({ name: z.string() }),
        response: z.object({ id: z.string(), name: z.string() }),
        handle: (c) => ({ id: c.req.valid('param').id, name: c.req.valid('json').name }),
      })
    )
    const client = hc<typeof app>('http://localhost')
    const route = client.users[':id'].$post

    it('Should infer the request input', () => {
      expectTypeOf<Parameters<typeof route>[0]>().toEqualTypeOf<{
        param: { id: string }
        json: { name: string }
      }>()
    })

    it('Should infer the validated response', () => {
      type Response200 = InferResponseType<typeof route, 200>
      expectTypeOf<Response200>().toEqualTypeOf<{ id: string; name: string }>()
    })

    it('Should infer the failure responses of Standard Schemas', () => {
      type Failure<T> = { success: false; target: T; error: { message: string }[] }
      expectTypeOf<
        Extract<InferResponseType<typeof route, 400>, { success: false }>
      >().toMatchTypeOf<Failure<'param' | 'json'>>()
      expectTypeOf<
        Extract<InferResponseType<typeof route, 500>, { success: false }>
      >().toEqualTypeOf<{ success: false; target: 'response' }>()
    })

    it('Should be a plain Response without a response schema', () => {
      const app = new Hono().get(
        '/',
        validatedHandler({
          handle: (c) => (Math.random() > 0.5 ? c.text('text', 202) : { ok: true }),
        })
      )
      const plain = new Hono().get('/', () => new Response('text'))
      type Body = InferResponseType<ReturnType<typeof hc<typeof app>>['index']['$get']>
      type PlainBody = InferResponseType<ReturnType<typeof hc<typeof plain>>['index']['$get']>
      expectTypeOf<Body>().toEqualTypeOf<PlainBody>()
    })

    it('Should only accept the response input type or a Response from handle', () => {
      validatedHandler({
        response: z.object({ id: z.string() }),
        handle: (c) => (Math.random() > 0.5 ? c.redirect('/') : { id: '1' }),
      })
      // @ts-expect-error `id` must be a string
      validatedHandler({
        response: z.object({ id: z.string() }),
        handle: () => ({ id: 1 }),
      })
    })
  })
})
