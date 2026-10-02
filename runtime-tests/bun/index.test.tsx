import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { stream, streamSSE } from '../..//src/helper/streaming'
import { Context } from '../../src/context'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import { Hono } from '../../src/index'
import type { PropsWithChildren } from '../../src/jsx'
import { basicAuth } from '../../src/middleware/basic-auth'
import { jwt } from '../../src/middleware/jwt'

declare module '../../src/index' {
  interface ContextRenderer {
    (content: string | Promise<string>, head: { title: string }): Response | Promise<Response>
  }
}

// Test just only minimal patterns.
// Because others are tested well in Cloudflare Workers environment already.

Bun.env.NAME = 'Bun'

describe('Basic', () => {
  const app = new Hono()
  app.get('/a/:foo', (c) => {
    c.header('x-param', c.req.param('foo'))
    c.header('x-query', c.req.query('q'))
    return c.text('Hello Bun!')
  })

  it('Should return 200 Response', async () => {
    const req = new Request('http://localhost/a/foo?q=bar')
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello Bun!')
    expect(res.headers.get('x-param')).toBe('foo')
    expect(res.headers.get('x-query')).toBe('bar')
  })

  it('returns current runtime (bun)', async () => {
    expect(getRuntimeKey()).toBe('bun')
  })
})

describe('Query parameters', () => {
  it.each([
    ['%6eame=first&name=second', 'first', ['first', 'second']],
    ['%6eame=first&name', 'first', ['first', '']],
    ['name&%6eame=second', '', ['', 'second']],
    ['other=value&name', '', ['']],
    ['name0=other&name=first', 'first', ['first']],
  ])('preserves the first decoded value for %s', async (query, expected, values) => {
    const app = new Hono()
    app.get('/', (c) =>
      c.json({
        value: c.req.query('name'),
        all: c.req.query(),
        values: c.req.queries('name'),
      })
    )

    const res = await app.request(`/?${query}`)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      value: expected,
      all: { name: expected },
      values,
    })
  })
})

describe('Environment Variables', () => {
  it('Should return the environment variable', async () => {
    const c = new Context(new Request('http://localhost/'))
    const { NAME } = env<{ NAME: string }>(c)
    expect(NAME).toBe('Bun')
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

// Bun support WebCrypto since v0.2.2
// So, JWT middleware works well.
describe('JWT Auth Middleware', () => {
  const app = new Hono()
  app.use('/jwt/*', jwt({ secret: 'a-secret', alg: 'HS256' }))
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

  const Layout = (props: PropsWithChildren) => {
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

describe('streaming', () => {
  const app = new Hono()
  let server: ReturnType<typeof Bun.serve>
  let aborted = false

  app.get('/stream', (c) => {
    return stream(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      return new Promise<void>((resolve) => {
        stream.onAbort(resolve)
      })
    })
  })
  app.get('/streamHello', (c) => {
    return stream(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      await stream.write('Hello')
    })
  })
  app.get('/streamSSE', (c) => {
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      return new Promise<void>((resolve) => {
        stream.onAbort(resolve)
      })
    })
  })
  app.get('/streamSSEHello', (c) => {
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      await stream.write('Hello')
    })
  })

  beforeEach(() => {
    aborted = false
    server = Bun.serve({ port: 0, fetch: app.fetch })
  })

  afterEach(() => {
    server.stop()
  })

  describe('stream', () => {
    it('Should call onAbort', async () => {
      const ac = new AbortController()
      const req = new Request(`http://localhost:${server.port}/stream`, {
        signal: ac.signal,
      })
      expect(aborted).toBe(false)
      const res = fetch(req).catch(() => {})
      await new Promise((resolve) => setTimeout(resolve, 10))
      ac.abort()
      await res
      while (!aborted) {
        await new Promise((resolve) => setTimeout(resolve))
      }
      expect(aborted).toBe(true)
    })

    it('Should not be called onAbort if already closed', async () => {
      expect(aborted).toBe(false)
      const res = await fetch(`http://localhost:${server.port}/streamHello`)
      expect(await res.text()).toBe('Hello')
      expect(aborted).toBe(false)
    })
  })

  describe('streamSSE', () => {
    it('Should call onAbort', async () => {
      const ac = new AbortController()
      const req = new Request(`http://localhost:${server.port}/streamSSE`, {
        signal: ac.signal,
      })
      const res = fetch(req).catch(() => {})
      await new Promise((resolve) => setTimeout(resolve, 10))
      ac.abort()
      await res
      while (!aborted) {
        await new Promise((resolve) => setTimeout(resolve))
      }
      expect(aborted).toBe(true)
    })

    it('Should not be called onAbort if already closed', async () => {
      expect(aborted).toBe(false)
      const res = await fetch(`http://localhost:${server.port}/streamSSEHello`)
      expect(await res.text()).toBe('Hello')
      expect(aborted).toBe(false)
    })
  })
})

describe('Buffers', () => {
  const app = new Hono().get('/', async (c) => {
    return c.body(Buffer.from('hello'))
  })

  it('should allow returning buffers', async () => {
    const res = await app.request(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })
})
