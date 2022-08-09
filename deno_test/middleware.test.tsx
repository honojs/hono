/** @jsx jsx */
/** @jsxFrag Fragment */
import { basicAuth, jsx, Fragment, serveStatic, jwt } from '../deno_dist/middleware.ts'
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
  assertEquals(res.headers.get('Content-Type'), 'image/x-icon')
})

Deno.test('JWT Authentication middleware', async () => {
  const app = new Hono()
  app.use('/*', async (c, next) => {
    await next()
    c.header('x-foo', c.get('x-foo') || '')
  })
  app.use('/auth/*', jwt({ secret: 'a-secret' }))
  app.get('/auth/*', (c) => {
    c.set('x-foo', 'bar')
    return new Response('auth')
  })

  const req = new Request('http://localhost/auth/a')
  const res = await app.request(req)
  assertEquals(res.status, 401)
  assertEquals(await res.text(), 'Unauthorized')
  assertEquals(res.headers.get('x-foo'), '')

  const credential =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
  const reqOK = new Request('http://localhost/auth/a')
  reqOK.headers.set('Authorization', `Bearer ${credential}`)
  const resOK = await app.request(reqOK)
  assertEquals(resOK.status, 200)
  assertEquals(await resOK.text(), 'auth')
  assertEquals(resOK.headers.get('x-foo'), 'bar')
})
