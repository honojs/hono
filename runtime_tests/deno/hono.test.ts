import {upgradeWebSocket} from '../../src/adapter/deno/websocket.js'
import { Context } from '../../src/context.ts'
import { env, getRuntimeKey } from '../../src/helper/adapter/index.ts'
import { Hono } from '../../src/hono.ts'
import { HonoRequest } from '../../src/request.ts'
import { assertEquals } from './deps.ts'

// Test just only minimal patterns.
// Because others are tested well in Cloudflare Workers environment already.

Deno.env.set('NAME', 'Deno')

Deno.test('Hello World', async () => {
  const app = new Hono()
  app.get('/:foo', (c) => {
    c.header('x-param', c.req.param('foo'))
    c.header('x-query', c.req.query('q') || '')
    return c.text('Hello Deno!')
  })

  const res = await app.request('/foo?q=bar')
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'Hello Deno!')
  assertEquals(res.headers.get('x-param'), 'foo')
  assertEquals(res.headers.get('x-query'), 'bar')
})

Deno.test('runtime', () => {
  assertEquals(getRuntimeKey(), 'deno')
})

Deno.test('environment variables', () => {
  const c = new Context(new HonoRequest(new Request('http://localhost/')))
  const { NAME } = env<{ NAME: string }>(c)
  assertEquals(NAME, 'Deno')
})

Deno.test('trigger the onOpen event of upgradeWebSocket', async () => {
  const app = new Hono()
  const open = new Promise<boolean>(resolve => {
    app.get('/ws', upgradeWebSocket(async (c) => {
      await new Promise(resolve => setTimeout(resolve, 5e2))
      return {
        onOpen: () => resolve(true)
      }
    }))
    const server = Deno.serve(app.fetch)
    const socket = new WebSocket('http://127.1:8000/ws')
    socket.onopen = () => {
      server.shutdown()
      socket.close()
    }
  })
  assertEquals(await open, true)
})
