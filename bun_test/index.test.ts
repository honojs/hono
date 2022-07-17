import { describe, expect, it } from 'bun:test'
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
  app.all('/favicon.ico', serveStatic({ path: './bun_test/favicon.ico' }))

  it('Should return static file correctly', async () => {
    const res = await app.request(new Request('http://localhost/favicon.ico'))
    await res.arrayBuffer()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/vnd.microsoft.icon')
  })
})

// JWT is not available for Bun
// It throw the Error
describe('JWT Middleware (Not supported yet)', () => {
  const app = new Hono()
  let t = false
  try {
    app.use('/jwt/*', jwt({ secret: 'a-secret' }))
  } catch {
    t = true
  }
  it('Throw the error', () => {
    expect(t).toBe(true)
  })
})
