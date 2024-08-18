/* eslint-disable @typescript-eslint/no-unused-vars */
import { expectTypeOf } from 'vitest'
import { Hono } from '..'
import { upgradeWebSocket } from '../adapter/deno/websocket'
import { hc } from '.'
import { HTTPException } from '../http-exception'
import type { Equal, Expect } from '../utils/types'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

describe('WebSockets', () => {
  const app = new Hono()
    .get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )
    .get('/', (c) => c.json({}))
  const client = hc<typeof app>('/')

  it('WebSocket route', () => {
    expectTypeOf(client.ws).toMatchTypeOf<{
      $ws: () => WebSocket
    }>()
  })
  it('Not WebSocket Route', () => {
    expectTypeOf<
      typeof client.index extends { $ws: () => WebSocket } ? false : true
    >().toEqualTypeOf(true)
  })
})

describe('without the leading slash', () => {
  const app = new Hono()
    .get('foo', (c) => c.json({}))
    .get('foo/bar', (c) => c.json({}))
    .get('foo/:id/baz', (c) => c.json({}))
  const client = hc<typeof app>('')
  it('`foo` should have `$get`', () => {
    expectTypeOf(client.foo).toHaveProperty('$get')
  })
  it('`foo.bar` should not have `$get`', () => {
    expectTypeOf(client.foo.bar).toHaveProperty('$get')
  })
  it('`foo[":id"].baz` should have `$get`', () => {
    expectTypeOf(client.foo[':id'].baz).toHaveProperty('$get')
  })
})

describe('with the leading slash', () => {
  const app = new Hono()
    .get('/foo', (c) => c.json({}))
    .get('/foo/bar', (c) => c.json({}))
    .get('/foo/:id/baz', (c) => c.json({}))
  const client = hc<typeof app>('')
  it('`foo` should have `$get`', () => {
    expectTypeOf(client.foo).toHaveProperty('$get')
  })
  it('`foo.bar` should not have `$get`', () => {
    expectTypeOf(client.foo.bar).toHaveProperty('$get')
  })
  it('`foo[":id"].baz` should have `$get`', () => {
    expectTypeOf(client.foo[':id'].baz).toHaveProperty('$get')
  })
})

describe('Status Code - test only Types', () => {
  const server = setupServer(
    http.get('http://localhost/foo', async () => {
      return HttpResponse.json({})
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const app = new Hono()
  const flag = {}

  const routes = app.get('/foo', (c) => {
    if (flag) {
      throw new HTTPException(500, {
        message: 'Server Error!',
      })
    }
    if (flag) {
      return c.json({ message: 'invalid!' }, 401)
    }
    if (flag) {
      return c.redirect('/', 301)
    }
    return c.json({ ok: true }, 200)
  })

  const client = hc<typeof routes>('http://localhost')

  it('Should handle different status codes', async () => {
    const res = await client.foo.$get()

    if (res.status === 500) {
      const data = await res.json<{ errorMessage: string }>()
      type Expected = { errorMessage: string }
      type verify = Expect<Equal<Expected, typeof data>>
    }

    if (res.status === 401) {
      const data = await res.json()
      type Expected = { message: string }
      type verify = Expect<Equal<Expected, typeof data>>
    }

    if (res.status === 200) {
      const data = await res.json()
      type Expected = { ok: boolean }
      type verify = Expect<Equal<Expected, typeof data>>
    }
  })

  it('Should infer union types', async () => {
    const res = await client.foo.$get()

    const data = await res.json()
    type Expected = { message: string } | { ok: boolean }
    type verify = Expect<Equal<Expected, typeof data>>
  })
})
