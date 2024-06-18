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
