import { env } from '../../deno_dist/adapter.ts'
import { Context } from '../../deno_dist/context.ts'
import { Hono } from '../../deno_dist/mod.ts'
import { assertEquals } from './deps.ts'

// Test just only minimal patterns.
// Because others are tested well in Cloudflare Workers environment already.

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
  const c = new Context(new Request('http://localhost/'))
  assertEquals(c.runtime, 'deno')
})

Deno.test('environment variables', () => {
  const c = new Context(new Request('http://localhost/'))
  const { NAME } = env<{ NAME: string }>(c)
  assertEquals(NAME, 'Deno')
})
