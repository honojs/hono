import { Context } from '../../deno_dist/context.ts'
import { env, getRuntimeKey } from '../../deno_dist/helper.ts'
import { Hono } from '../../deno_dist/mod.ts'
import { HonoRequest } from '../../deno_dist/request.ts'
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
