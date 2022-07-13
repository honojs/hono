import assert from 'node:assert'
import { Hono } from '../src/index'
// Currently, Basic Auth middleware is not available on Bun
// import { basicAuth } from '../src/middleware/basic-auth'
import { serveStatic } from '../src/middleware/serve-static/bun'

// Test just only minimal patterns.
// Because others are tested well in Cloudflare Workers environment already.

const app = new Hono()
app.get('/a/:foo', (c) => {
  c.header('x-param', c.req.param('foo'))
  c.header('x-query', c.req.query('q'))
  return c.text('Hello Deno!')
})

const req = new Request('http://localhost/a/foo?q=bar')
const res = await app.request(req)
assert.strictEqual(res.status, 200)
assert.strictEqual(await res.text(), 'Hello Deno!')
assert.strictEqual(res.headers.get('x-param'), 'foo')
assert.strictEqual(res.headers.get('x-query'), 'bar')

/*
// Basic Auth
const username = 'hono-user-a'
const password = 'hono-password-a'

app.use(
  '/auth/*',
  basicAuth({
    username,
    password,
  })
)

app.get('/auth/*', () => new Response('auth'))

const req = new Request('http://localhost/auth/a')
const res = await app.request(req)
assert.strictEqual(res.status, 401)
assert.strictEqual(await res.text(), 'Unauthorized')

const credential = 'aG9uby11c2VyLWE6aG9uby1wYXNzd29yZC1h'

req.headers.set('Authorization', `Basic ${credential}`)
const resOK = await app.request(req)
assert.strictEqual(resOK.status, 200)
assert.strictEqual(await resOK.text(), 'auth')
*/

// Serve Static
app.all('/favicon.ico', serveStatic({ path: './bun_test/favicon.ico' }))
const resStatic = await app.request(new Request('http://localhost/favicon.ico'))
await resStatic.arrayBuffer()
assert.strictEqual(resStatic.status, 200)
assert.strictEqual(resStatic.headers.get('Content-Type'), 'image/vnd.microsoft.icon')
