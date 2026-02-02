import { assertEquals } from '@std/assert'

import { Context } from '../../src/context.ts'
import { env, getRuntimeKey } from '../../src/helper/adapter/index.ts'
import { Hono } from '../../src/hono.ts'

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
  const c = new Context(new Request('http://localhost/'))
  const { NAME } = env<{ NAME: string }>(c)
  assertEquals(NAME, 'Deno')
})
