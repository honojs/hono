import { expectTypeOf, vi } from 'vitest'
import { upgradeWebSocket } from '../adapter/deno/websocket'
import { Hono } from '../hono'
import type { FormValue } from '../types'
import { validator } from '../validator'
import { hcx } from './client'
import type { InferRequestType, InferResponseType, TypedURL } from './types'

const app = new Hono()
  .get('/', (c) => c.json({ root: true }, 200))
  .get('/users', (c) => c.json([{ id: 'u1' }], 200))
  .post(
    '/users',
    validator('json', () => ({}) as { name: string; age: number }),
    async (c) => c.json({ id: 'u1', body: await c.req.json<{ name: string }>() }, 201)
  )
  // trailing slash -> `index`
  .get('/users/', (c) => c.json({ index: true }, 200))
  // a real segment named `index` is not the trailing-slash marker
  .get('/a/index/b', (c) => c.json({ mid: true }, 200))
  .get('/users/:id', (c) =>
    c.req.param('id') === 'missing'
      ? c.json({ error: 'Not found' as const }, 404)
      : c.json({ id: c.req.param('id'), name: 'Widget' }, 200)
  )
  .put(
    '/users/:id',
    validator('json', () => ({}) as { name: string }),
    validator('query', () => ({}) as { dry?: string }),
    async (c) =>
      c.json(
        {
          id: c.req.param('id'),
          body: await c.req.json<{ name: string }>(),
          dry: c.req.query('dry') ?? null,
        },
        200
      )
  )
  .delete(
    '/users/:id',
    validator('json', () => ({}) as { reason: string }),
    async (c) => c.json({ deleted: c.req.param('id'), body: await c.req.json<unknown>() }, 200)
  )
  .delete(
    '/users/:id/export',
    validator('header', () => ({}) as { 'x-confirm': string }),
    (c) => c.json({ confirmed: c.req.header('x-confirm') ?? null }, 200)
  )
  // sibling param at the same level as `:id`
  .get('/users/:userId/posts', (c) => c.json({ posts: [c.req.param('userId')] }, 200))
  .get('/users/:userId/posts/:postId', (c) =>
    c.json({ userId: c.req.param('userId'), postId: c.req.param('postId') }, 200)
  )
  // regex param
  .get('/posts/:pid{[0-9]+}', (c) => c.json({ pid: c.req.param('pid') }, 200))
  .get(
    '/search',
    validator('query', () => ({}) as { q: string }),
    (c) => c.json({ hits: [c.req.query('q') ?? ''] }, 200)
  )
  .get(
    '/session',
    validator('cookie', () => ({}) as { session: string }),
    (c) => c.json({ cookie: c.req.header('cookie') ?? null }, 200)
  )
  .post(
    '/upload',
    validator('form', () => ({}) as { file: File; note: string }),
    async (c) => {
      const body = await c.req.parseBody()
      return c.json({ note: String(body.note), file: (body.file as File).name }, 200)
    }
  )
  // two trailing optionals
  .get('/v1/lb/:version?/:platform?', (c) =>
    c.json(
      { version: c.req.param('version') ?? null, platform: c.req.param('platform') ?? null },
      200
    )
  )
  .all('/any', (c) => c.json({ method: c.req.method }, 200))
  .get(
    '/ws',
    upgradeWebSocket(() => ({}))
  )

const api = hcx<typeof app, 'http://localhost'>('http://localhost', { fetch: app.request })

describe('hcx', () => {
  it('sends a static path through `$get`', async () => {
    const res = await api.users.$get()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: 'u1' }])
  })

  it('puts a query in the options slot', async () => {
    const res = await api.search.$get({ query: { q: 'hono' } })
    expect(await res.json()).toEqual({ hits: ['hono'] })
  })

  it('binds params by calling a segment, chained and back-to-back', async () => {
    const res = await api.users({ id: 'u1' }).$get()
    expect(await res.json()).toEqual({
      id: 'u1',
      name: 'Widget',
    })
    const res2 = await api.users({ userId: 'u1' }).posts({ postId: 'p9' }).$get()
    expect(await res2.json()).toEqual({ userId: 'u1', postId: 'p9' })
    const res3 = await api.v1.lb({ version: 'v2' })({ platform: 'ios' }).$get()
    expect(await res3.json()).toEqual({
      version: 'v2',
      platform: 'ios',
    })
  })

  it('resolves sibling params to their own subtree', async () => {
    const res = await api.users({ userId: 'u1' }).posts.$get()
    expect(await res.json()).toEqual({
      posts: ['u1'],
    })
    expect(api.users({ id: 'u1' }).$path()).toBe('/users/u1')
    expect(api.users({ userId: 'u1' }).posts.$path()).toBe('/users/u1/posts')
  })

  it('sends the json body positionally, with param and options', async () => {
    const res = await api.users.$post({ name: 'Bolt', age: 3 })
    expect(await res.json()).toEqual({
      id: 'u1',
      body: { name: 'Bolt', age: 3 },
    })
    const updated = await api.users({ id: 'u1' }).$put({ name: 'Nut' }, { query: { dry: '1' } })
    expect(await updated.json()).toEqual({ id: 'u1', body: { name: 'Nut' }, dry: '1' })
  })

  it('sends `$delete` with and without a body', async () => {
    const res = await api.users({ id: 'u1' }).$delete({ reason: 'spam' })
    expect(await res.json()).toEqual({
      deleted: 'u1',
      body: { reason: 'spam' },
    })
    const confirmed = await api
      .users({ id: 'u1' })
      .export.$delete(undefined, { header: { 'x-confirm': 'yes' } })
    expect(await confirmed.json()).toEqual({ confirmed: 'yes' })
  })

  it('serializes a validated cookie from the options slot', async () => {
    const res = await api.session.$get({ cookie: { session: 's1' } })
    expect(await res.json()).toEqual({ cookie: 'session=s1' })
  })

  it('sends `.form` as multipart', async () => {
    const res = await api.upload.$post.form({
      file: new File(['hi'], 'note.txt'),
      note: 'hello',
    })
    expect(await res.json()).toEqual({ note: 'hello', file: 'note.txt' })
  })

  it('builds `$url` and `$path`, including a hoisted and a bound optional', () => {
    expect(api.search.$url({ query: { q: 'hono' } }).href).toBe('http://localhost/search?q=hono')
    expectTypeOf(api.users({ id: 'u1' }).$url().href).toEqualTypeOf<'http://localhost/users/u1'>()
    expect(api.users({ id: 'u1' }).$url().href).toBe('http://localhost/users/u1')
    expect(api.users({ id: 'u1' }).$path()).toBe('/users/u1')
    const id: string = 'u1'
    expectTypeOf(api.users({ id }).$path()).toEqualTypeOf<'/users/:id'>()
    expect(api.users({ id }).$path()).toBe('/users/u1')
    expectTypeOf(api.v1.lb.$url().href).toEqualTypeOf<'http://localhost/v1/lb'>()
    expectTypeOf(api.v1.lb.$path()).toEqualTypeOf<'/v1/lb'>()
    expect(api.v1.lb.$path()).toBe('/v1/lb')
    expectTypeOf(api.v1.lb({ version: 'v2' }).$path()).toEqualTypeOf<'/v1/lb/v2'>()
    expect(api.v1.lb({ version: 'v2' }).$path()).toBe('/v1/lb/v2')
  })

  it('opens a `$ws` with query through the `webSocket` option', () => {
    const webSocketMock = vi.fn(() => ({}) as WebSocket)
    const wsClient = hcx<typeof app, 'http://localhost'>('http://localhost', {
      webSocket: webSocketMock,
    })
    wsClient.ws.$ws({ query: { room: 'lobby' } })
    // @ts-expect-error `$ws` takes a query and nothing else, `hc` forwards nothing else
    wsClient.ws.$ws({ init: {} })
    expect(webSocketMock).toHaveBeenCalledWith('ws://localhost/ws?room=lobby')
  })

  it('calls an `$all` route through `$get` and `$post`', async () => {
    const res = await api.any.$get()
    expect(await res.json()).toEqual({ method: 'GET' })
    const res2 = await api.any.$post()
    expect(await res2.json()).toEqual({ method: 'POST' })
  })

  it('reaches a trailing optional both hoisted and bound', async () => {
    const res = await api.v1.lb.$get()
    expect(await res.json()).toEqual({ version: null, platform: null })
    const res2 = await api.v1.lb({ version: 'v2' }).$get()
    expect(await res2.json()).toEqual({
      version: 'v2',
      platform: null,
    })
  })

  it('puts `/` on the root node and a trailing-slash route on `index`', async () => {
    const res = await api.$get()
    expect(await res.json()).toEqual({ root: true })
    expectTypeOf(api.users.index.$path()).toEqualTypeOf<'/users'>()
    expect(api.users.index.$path()).toBe('/users')
    expect(api.$path()).toBe('/')
    expectTypeOf(api.a.index.b.$path()).toEqualTypeOf<'/a/index/b'>()
    expect(api.a.index.b.$path()).toBe('/a/index/b')
    const res2 = await api.a.index.b.$get()
    expect(await res2.json()).toEqual({ mid: true })
  })

  it('merges per-call `init` and `headers` over the client-level ones', async () => {
    const fetchSpy = vi.fn(app.request)
    const client = hcx<typeof app, 'http://localhost'>('http://localhost', {
      fetch: fetchSpy,
      headers: { 'x-base': 'base', 'x-both': 'base' },
    })
    await client.users.$get({ headers: { 'x-both': 'call' }, init: { cache: 'no-store' } })
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://localhost/users')
    expect(init?.cache).toBe('no-store')
    const headers = new Headers(init?.headers)
    expect(headers.get('x-base')).toBe('base')
    expect(headers.get('x-both')).toBe('call')
  })

  it('does not hang on `await` of a node or a leaf', async () => {
    expect(await api.users).toBeTypeOf('function')
    expect(await api.users.$get).toBeTypeOf('function')
  })

  it('binds a regex param by its bare name', async () => {
    expectTypeOf(api.posts({ pid: '7' }).$path()).toEqualTypeOf<'/posts/7'>()
    const res = await api.posts({ pid: '7' }).$get()
    expect(await res.json()).toEqual({ pid: '7' })
  })

  it('can be stringified, like `hc`', () => {
    expect(() => String(api.users)).not.toThrow()
    expect(() => `${api.users.$get}`).not.toThrow()
  })

  it('throws on a segment call that does not bind exactly one param', () => {
    // @ts-expect-error the param object is not optional.
    expect(() => api.users()).toThrow(/exactly one path param/)
    // @ts-expect-error a segment binds one param at a time.
    expect(() => api.users({ id: 'u1', userId: 'u2' })).toThrow(/exactly one path param/)
  })

  it('throws on a `:` key, which only exists for the type', () => {
    expect(() => api.users[':id']).toThrow(/type-only key/)
  })

  it('narrows the response body union on `res.ok`', async () => {
    const notFound = await api.users({ id: 'missing' }).$get()
    if (notFound.ok) {
      throw new Error('expected a 404')
    }
    expect(await notFound.json()).toEqual({ error: 'Not found' })
    const found = await api.users({ id: 'u1' }).$get()
    if (!found.ok) {
      throw new Error('expected a 200')
    }
    expect(await found.json()).toEqual({ id: 'u1', name: 'Widget' })
  })
})

describe('hcx types', () => {
  it('rejects a mistyped or missing param key', () => {
    void (() => api.users({ id: 'u1' }))
    // @ts-expect-error the segment is `:id`, not `:identifier`.
    void (() => api.users({ identifier: 'u1' }))
    // @ts-expect-error the param object is not optional.
    void (() => api.users())
    // @ts-expect-error hono drops a falsy segment, so params are strings only.
    void (() => api.users({ id: 0 }))
  })

  it('resolves sibling params to their own subtree', () => {
    expectTypeOf(api.users({ userId: 'u1' }).posts).toHaveProperty('$get')
    // @ts-expect-error `posts` only lives under `:userId`.
    void (() => api.users({ id: 'u1' }).posts)
  })

  it('types the body as the route json and rejects a bad one', () => {
    expectTypeOf(api.users.$post).parameter(0).toEqualTypeOf<{ name: string; age: number }>()
    // @ts-expect-error `age` is required.
    void (() => api.users.$post({ name: 'Bolt' }))
    expectTypeOf(api.users({ id: 'u1' }).export.$delete)
      .parameter(0)
      .toEqualTypeOf<undefined>()
  })

  it('makes options required only when the route needs them', () => {
    void (() => api.users.$get())
    void (() => api.search.$get({ query: { q: 'x' } }))
    // @ts-expect-error the route declares a required query.
    void (() => api.search.$get())
    // @ts-expect-error the route declares a required header.
    void (() => api.users({ id: 'u1' }).export.$delete(undefined))
    void (() => api.users({ id: 'u1' }).export.$delete(undefined, { header: { 'x-confirm': 'y' } }))
  })

  it('exposes `.form` only on a route with a form validator', () => {
    // hono widens a form input to the wire shape, the same as `hc`
    expectTypeOf(api.upload.$post.form).parameter(0).toEqualTypeOf<{
      file: FormValue | FormValue[]
      note: FormValue | FormValue[]
    }>()
    // @ts-expect-error `/users` declares json, not form.
    void (() => api.users.$post.form)
  })

  it('hoists a trailing optional onto the parent node', () => {
    expectTypeOf(api.v1.lb.$get()).resolves.toHaveProperty('ok')
    expectTypeOf(api.v1.lb({ version: 'v2' }).$get()).resolves.toHaveProperty('ok')
    expectTypeOf(api.v1.lb({ version: 'v2' })({ platform: 'ios' }).$get()).resolves.toHaveProperty(
      'ok'
    )
    // the wire path of a hoisted call is the short one; a bound one substitutes the value
    expectTypeOf(api.v1.lb.$path()).toEqualTypeOf<'/v1/lb'>()
    expectTypeOf(api.v1.lb({ version: 'v2' }).$path()).toEqualTypeOf<'/v1/lb/v2'>()
  })

  it('types `$url` and `$path` per node', () => {
    expectTypeOf(api.users.$url()).toEqualTypeOf<TypedURL<'http:', 'localhost', '', '/users', ''>>()
    expectTypeOf(api.users({ id: 'u1' }).$path()).toEqualTypeOf<'/users/u1'>()
    expectTypeOf(api.search.$path({ query: { q: 'x' } })).toEqualTypeOf<`/search?${string}`>()
  })

  it('puts `/` on the root node and a trailing-slash route on `index`', () => {
    expectTypeOf(api.$get()).resolves.toHaveProperty('ok')
    expectTypeOf(api.users.index.$get()).resolves.toHaveProperty('ok')
    expectTypeOf(api.$path()).toEqualTypeOf<'/'>()
  })

  it('expands `$all` into the standard methods', () => {
    expectTypeOf(api.any).toHaveProperty('$get')
    expectTypeOf(api.any).toHaveProperty('$post')
    expectTypeOf(api.any.$post).parameter(0).toEqualTypeOf<undefined>()
  })

  it('adds `$ws` only on a websocket route', () => {
    expectTypeOf(api.ws.$ws()).toEqualTypeOf<WebSocket>()
    // @ts-expect-error `/users` is not a websocket route.
    void (() => api.users.$ws)
  })

  it("keeps hono's Infer helpers working on the new signatures", () => {
    expectTypeOf<InferRequestType<typeof api.users.$post>>().toEqualTypeOf<{
      name: string
      age: number
    }>()
    // on a read `InferRequestType` yields the options slot, not a body
    expectTypeOf<InferRequestType<typeof api.search.$get>['query']>().toEqualTypeOf<{
      q: string | string[]
    }>()
    // the type-only `:id` key still names the route for the `Infer*` helpers
    expectTypeOf<InferRequestType<(typeof api.users)[':id']['$put']>>().toEqualTypeOf<{
      name: string
    }>()
    expectTypeOf<InferResponseType<typeof api.users.$get, 200>>().toEqualTypeOf<{ id: string }[]>()
    expectTypeOf<InferResponseType<(typeof api.users)[':id']['$get'], 404>>().toEqualTypeOf<{
      error: 'Not found'
    }>()
  })

  it('narrows the response union by status', () => {
    expectTypeOf<InferResponseType<(typeof api.users)[':id']['$get'], 200>>().toEqualTypeOf<{
      id: string
      name: string
    }>()
  })
})
