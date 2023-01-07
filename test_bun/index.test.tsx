import { describe, expect, it } from 'bun:test'
import { Context } from '../src/context'
import { Hono } from '../src/index'
import { basicAuth } from '../src/middleware/basic-auth'
import { jwt } from '../src/middleware/jwt'
import { serveStatic } from '../src/middleware/serve-static/bun'

// Test just only minimal patterns.
// Because others are tested well in Cloudflare Workers environment already.

describe('Basic', () => {
  const app = new Hono()
  app.get('/a/:foo', (c) => {
    c.header('x-param', c.req.param('foo'))
    c.header('x-query', c.req.query('q'))
    return c.text('Hello Deno!')
  })

  it('Should return 200 Response', async () => {
    const req = new Request('http://localhost/a/foo?q=bar')
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello Deno!')
    expect(res.headers.get('x-param')).toBe('foo')
    expect(res.headers.get('x-query')).toBe('bar')
  })

  it('returns current runtime (bun)', async () => {
    const c = new Context(new Request('http://localhost/'))
    expect(c.runtime).toBe('bun')
  })
})

describe('Basic Auth Middleware', () => {
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

  it('Should not authorize, return 401 Response', async () => {
    const req = new Request('http://localhost/auth/a')
    const res = await app.request(req)
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should authorize, return 200 Response', async () => {
    const credential = 'aG9uby11c2VyLWE6aG9uby1wYXNzd29yZC1h'
    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })
})

describe('Serve Static Middleware', () => {
  const app = new Hono()
  app.all('/favicon.ico', serveStatic({ path: './test_bun/favicon.ico' }))
  app.all('/favicon-notfound.ico', serveStatic({ path: './test_bun/favicon-notfound.ico' }))
  app.use('/favicon-notfound.ico', async (c, next) => {
    await next()
    c.header('X-Custom', 'Bun')
  })

  it('Should return static file correctly', async () => {
    const res = await app.request(new Request('http://localhost/favicon.ico'))
    await res.arrayBuffer()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/x-icon')
  })

  it('Should return 404 response', async () => {
    const res = await app.request(new Request('http://localhost/favicon-notfound.ico'))
    expect(res.status).toBe(404)
    expect(res.headers.get('X-Custom')).toBe('Bun')
  })
})

// Bun support WebCrypto since v0.2.2
// So, JWT middleware works well.
describe('JWT Auth Middleware', () => {
  const app = new Hono()
  app.use('/jwt/*', jwt({ secret: 'a-secret' }))
  app.get('/jwt/a', (c) => c.text('auth'))

  it('Should not authorize, return 401 Response', async () => {
    const req = new Request('http://localhost/jwt/a')
    const res = await app.request(req)
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should authorize, return 200 Response', async () => {
    const credential =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
    const req = new Request('http://localhost/jwt/a')
    req.headers.set('Authorization', `Bearer ${credential}`)
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })
})

// To enable JSX middleware,
// set "jsxImportSource": "hono/jsx" in the tsconfig.json
describe('JSX Middleware', () => {
  const app = new Hono()

  const Layout = (props: { children?: string }) => {
    return <html>{props.children}</html>
  }

  app.get('/', (c) => {
    return c.html(<h1>Hello</h1>)
  })
  app.get('/nest', (c) => {
    return c.html(
      <h1>
        <a href='/top'>Hello</a>
      </h1>
    )
  })
  app.get('/layout', (c) => {
    return c.html(
      <Layout>
        <p>hello</p>
      </Layout>
    )
  })

  it('Should return rendered HTML', async () => {
    const res = await app.request(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe('<h1>Hello</h1>')
  })

  it('Should return rendered HTML with nest', async () => {
    const res = await app.request(new Request('http://localhost/nest'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe('<h1><a href="/top">Hello</a></h1>')
  })

  it('Should return rendered HTML with Layout', async () => {
    const res = await app.request(new Request('http://localhost/layout'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe('<html><p>hello</p></html>')
  })
})
