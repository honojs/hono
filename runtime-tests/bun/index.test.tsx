import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { stream, streamSSE } from '../..//src/helper/streaming'
import { serveStatic, toSSG } from '../../src/adapter/bun'
import { createBunWebSocket } from '../../src/adapter/bun/websocket'
import type { BunWebSocketData } from '../../src/adapter/bun/websocket'
import { Context } from '../../src/context'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import type { WSMessageReceive } from '../../src/helper/websocket'
import { Hono } from '../../src/index'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from '../../src/jsx'
import { basicAuth } from '../../src/middleware/basic-auth'
import { jwt } from '../../src/middleware/jwt'

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

describe('Serve Static Middleware', () => {
  const app = new Hono()
  const onNotFound = vi.fn(() => {})
  app.all('/favicon.ico', serveStatic({ path: './runtime-tests/bun/favicon.ico' }))
  app.all(
    '/favicon-notfound.ico',
    serveStatic({ path: './runtime-tests/bun/favicon-notfound.ico', onNotFound })
  )
  app.use('/favicon-notfound.ico', async (c, next) => {
    await next()
    c.header('X-Custom', 'Bun')
  })
  app.get(
    '/static/*',
    serveStatic({
      root: './runtime-tests/bun/',
      onNotFound,
    })
  )
  app.get(
    '/dot-static/*',
    serveStatic({
      root: './runtime-tests/bun/',
      rewriteRequestPath: (path) => path.replace(/^\/dot-static/, './.static'),
    })
  )

  app.all('/static-absolute-root/*', serveStatic({ root: path.dirname(__filename) }))

  beforeEach(() => onNotFound.mockClear())

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
    expect(onNotFound).toHaveBeenCalledWith(
      './runtime-tests/bun/favicon-notfound.ico',
      expect.anything()
    )
  })

  it('Should return 200 response - /static/plain.txt', async () => {
    const res = await app.request(new Request('http://localhost/static/plain.txt'))
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^Bun!(\r?\n)?$/)
    expect(onNotFound).not.toHaveBeenCalled()
  })

  it('Should return 200 response - /static/download', async () => {
    const res = await app.request(new Request('http://localhost/static/download'))
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^download(\r?\n)?$/)
    expect(onNotFound).not.toHaveBeenCalled()
  })

  it('Should return 200 response - /dot-static/plain.txt', async () => {
    const res = await app.request(new Request('http://localhost/dot-static/plain.txt'))
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^Bun!!(\r?\n)?$/)
  })

  it('Should return 200 response - /static/helloworld', async () => {
    const res = await app.request('http://localhost/static/helloworld')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/Hi\r?\n/)
  })

  it('Should return 200 response - /static/hello.world', async () => {
    const res = await app.request('http://localhost/static/hello.world')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/Hi\r?\n/)
  })

  it('Should return 200 response - /static-absolute-root/plain.txt', async () => {
    const res = await app.request('http://localhost/static-absolute-root/plain.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^Bun!(\r?\n)?$/)
    expect(onNotFound).not.toHaveBeenCalled()
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

describe('toSSG function', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.get('/', (c) => c.text('Hello, World!'))
    app.get('/about', (c) => c.text('About Page'))
    app.get('/about/some', (c) => c.text('About Page 2tier'))
    app.post('/about/some/thing', (c) => c.text('About Page 3tier'))
    app.get('/bravo', (c) => c.html('Bravo Page'))
    app.get('/Charlie', async (c, next) => {
      c.setRenderer((content, head) => {
        return c.html(
          <html>
            <head>
              <title>{head.title || ''}</title>
            </head>
            <body>
              <p>{content}</p>
            </body>
          </html>
        )
      })
      await next()
    })
    app.get('/Charlie', (c) => {
      return c.render('Hello!', { title: 'Charlies Page' })
    })
  })

  it('Should correctly generate static HTML files for Hono routes', async () => {
    const result = await toSSG(app, { dir: './static' })
    expect(result.success).toBeTruly
    expect(result.error).toBeUndefined()
    expect(result.files).toBeDefined()
    afterAll(async () => {
      await deleteDirectory('./static')
    })
  })
})

describe('WebSockets Helper', () => {
  const app = new Hono()
  const { websocket, upgradeWebSocket } = createBunWebSocket()

  it('Should websockets is working', async () => {
    const receivedMessagePromise = new Promise<WSMessageReceive>((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage(evt) {
            resolve(evt.data)
          },
        }))
      )
    )
    const upgradedData = await new Promise<BunWebSocketData>((resolve) =>
      app.fetch(new Request('http://localhost/ws'), {
        upgrade: (_req: Request, data: { data: BunWebSocketData }) => {
          resolve(data.data)
        },
      })
    )
    const message = Math.random().toString()
    websocket.message(
      {
        close: () => undefined,
        readyState: 3,
        data: upgradedData,
        send: () => undefined,
      },
      message
    )
    const receivedMessage = await receivedMessagePromise
    expect(receivedMessage).toBe(message)
  })
})

async function deleteDirectory(dirPath) {
  if (
    await fs
      .stat(dirPath)
      .then((stat) => stat.isDirectory())
      .catch(() => false)
  ) {
    for (const entry of await fs.readdir(dirPath)) {
      const entryPath = path.join(dirPath, entry)
      await deleteDirectory(entryPath)
    }
    await fs.rmdir(dirPath)
  } else {
    await fs.unlink(dirPath)
  }
}

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
