/* eslint-disable @typescript-eslint/no-unused-vars */
import { expectTypeOf } from 'vitest'
import { Hono } from '..'
import { upgradeWebSocket } from '../adapter/deno/websocket'
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
