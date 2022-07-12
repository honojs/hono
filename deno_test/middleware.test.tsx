/** @jsx jsx */
/** @jsxFrag Fragment */
import { basicAuth, jsx, Fragment, serveStatic } from '../deno_dist/middleware.ts'
import { Hono } from '../deno_dist/mod.ts'
import { assertEquals } from './deps.ts'

// Test just only minimal patterns.
// Because others are already tested well in Cloudflare Workers environment.

Deno.test('Basic Auth Middleware', async () => {
  const app = new Hono()

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

  const res = await app.request('http://localhost/auth/a')
  assertEquals(res.status, 401)
  assertEquals(await res.text(), 'Unauthorized')

  const credential = 'aG9uby11c2VyLWE6aG9uby1wYXNzd29yZC1h'

  const req = new Request('http://localhost/auth/a')
  req.headers.set('Authorization', `Basic ${credential}`)
  const resOK = await app.request(req)
  assertEquals(resOK.status, 200)
  assertEquals(await resOK.text(), 'auth')
})

Deno.test('JSX middleware', async () => {
  const app = new Hono()
  app.get('/', (c) => {
    return c.html(<h1>Hello</h1>)
  })
  const res = await app.request('http://localhost/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'text/html; charset=UTF-8')
  assertEquals(await res.text(), '<h1>Hello</h1>')

  // Fragment
  const template = (
    <>
      <p>1</p>
      <p>2</p>
    </>
  )
  assertEquals(template.toString(), '<p>1</p><p>2</p>')
})

Deno.test('Serve Static middleware', async () => {
  const app = new Hono()
  app.all('/favicon.ico', serveStatic({ path: './deno_test/favicon.ico' }))
  const res = await app.request('http://localhost/favicon.ico')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'image/vnd.microsoft.icon')
})
