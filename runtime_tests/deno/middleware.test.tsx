/** @jsx jsx */
/** @jsxFrag Fragment */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { basicAuth, jsx, Fragment, serveStatic, jwt } from '../../deno_dist/middleware.ts'
import { Hono } from '../../deno_dist/mod.ts'
import { assertEquals, assertMatch, assertSpyCall, assertSpyCalls, spy } from './deps.ts'

// Test just only minimal patterns.
// Because others are already tested well in Cloudflare Workers environment.

Deno.test('Basic Auth Middleware', async () => {
  const app = new Hono()

  const username = 'hono'
  const password = 'acoolproject'

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

  const credential = 'aG9ubzphY29vbHByb2plY3Q='

  const req = new Request('http://localhost/auth/a')
  req.headers.set('Authorization', `Basic ${credential}`)
  const resOK = await app.request(req)
  assertEquals(resOK.status, 200)
  assertEquals(await resOK.text(), 'auth')

  const invalidCredential = 'G9ubzphY29vbHByb2plY3Q='

  const req2 = new Request('http://localhost/auth/a')
  req2.headers.set('Authorization', `Basic ${invalidCredential}`)
  const resNG = await app.request(req2)
  assertEquals(resNG.status, 401)
  assertEquals(await resNG.text(), 'Unauthorized')
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
  const onNotFound = spy(() => {})
  app.all('/favicon.ico', serveStatic({ path: './runtime_tests/deno/favicon.ico' }))
  app.all(
    '/favicon-notfound.ico',
    serveStatic({ path: './runtime_tests/deno/favicon-notfound.ico', onNotFound })
  )
  app.use('/favicon-notfound.ico', async (c, next) => {
    await next()
    c.header('X-Custom', 'Deno')
  })

  app.get(
    '/static/*',
    serveStatic({
      root: './runtime_tests/deno',
      onNotFound,
    })
  )

  app.get(
    '/dot-static/*',
    serveStatic({
      root: './runtime_tests/deno',
      rewriteRequestPath: (path) => path.replace(/^\/dot-static/, './.static'),
    })
  )

  let res = await app.request('http://localhost/favicon.ico')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'image/x-icon')
  await res.body?.cancel()

  res = await app.request('http://localhost/favicon-notfound.ico')
  assertEquals(res.status, 404)
  assertMatch(res.headers.get('Content-Type') || '', /^text\/plain/)
  assertEquals(res.headers.get('X-Custom'), 'Deno')
  assertSpyCall(onNotFound, 0)

  res = await app.request('http://localhost/static/plain.txt')
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'Deno!')

  res = await app.request('http://localhost/static/download')
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'download')

  res = await app.request('http://localhost/dot-static/plain.txt')
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'Deno!!')
  assertSpyCalls(onNotFound, 1)
})

Deno.test('JWT Authentication middleware', async () => {
  const app = new Hono<{ Variables: { 'x-foo': string } }>()
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
