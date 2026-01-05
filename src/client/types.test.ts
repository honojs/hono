/* eslint-disable @typescript-eslint/no-unused-vars */
import { expectTypeOf } from 'vitest'
import { Hono } from '..'
import { upgradeWebSocket } from '../adapter/deno/websocket'
import type { TypedURL } from './types'
import { hc } from '.'

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
  const client = hc<typeof app, 'http://localhost'>('http://localhost')
  it('`foo` should have `$get`', () => {
    expectTypeOf(client.foo).toHaveProperty('$get')
    expectTypeOf(client.foo.$url()).toEqualTypeOf<TypedURL<'http:', 'localhost', '', '/foo', ''>>()
  })
  it('`foo.bar` should not have `$get`', () => {
    expectTypeOf(client.foo.bar).toHaveProperty('$get')
    expectTypeOf(client.foo.bar.$url()).toEqualTypeOf<
      TypedURL<'http:', 'localhost', '', '/foo/bar', ''>
    >()
  })
  it('`foo[":id"].baz` should have `$get`', () => {
    expectTypeOf(client.foo[':id'].baz).toHaveProperty('$get')
    expectTypeOf(client.foo[':id'].baz.$url()).toEqualTypeOf<
      TypedURL<'http:', 'localhost', '', '/foo/:id/baz', ''>
    >()
    expectTypeOf(
      client.foo[':id'].baz.$url({
        param: { id: '123' },
      })
    ).toEqualTypeOf<TypedURL<'http:', 'localhost', '', '/foo/123/baz', ''>>()
    expectTypeOf(
      client.foo[':id'].baz.$url({
        param: { id: '123' },
        query: { q: 'hono' },
      })
    ).toEqualTypeOf<TypedURL<'http:', 'localhost', '', '/foo/123/baz', `?${string}`>>()
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

describe('app.all()', () => {
  const app = new Hono()
    .all('/all-route', (c) => c.json({ msg: 'all methods' }))
    .get('/get-route', (c) => c.json({ msg: 'get only' }))
  const client = hc<typeof app>('http://localhost')

  it('should NOT expose $all on the client', () => {
    expectTypeOf<
      (typeof client)['all-route'] extends { $all: unknown } ? true : false
    >().toEqualTypeOf<false>()
  })

  it('should still expose valid HTTP methods like $get', () => {
    expectTypeOf(client['get-route']).toHaveProperty('$get')
  })
})
