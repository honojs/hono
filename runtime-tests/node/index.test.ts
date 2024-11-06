import { createAdaptorServer, serve } from '@hono/node-server'
import request from 'supertest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Hono } from '../../src'
import { Context } from '../../src/context'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import { stream, streamSSE } from '../../src/helper/streaming'
import { basicAuth } from '../../src/middleware/basic-auth'
import { compress } from '../../src/middleware/compress'
import { jwt } from '../../src/middleware/jwt'

// Test only minimal patterns.
// See <https://github.com/honojs/node-server> for more tests and information.

describe('Basic', () => {
  const app = new Hono()

  app.get('/', (c) => {
    return c.text('Hello! Node.js!')
  })
  app.get('/runtime-name', (c) => {
    return c.text(getRuntimeKey())
  })

  const server = createAdaptorServer(app)

  it('Should return 200 response', async () => {
    const res = await request(server).get('/')
    expect(res.status).toBe(200)
    expect(res.text).toBe('Hello! Node.js!')
  })

  it('Should return correct runtime name', async () => {
    const res = await request(server).get('/runtime-name')
    expect(res.status).toBe(200)
    expect(res.text).toBe('node')
  })
})

describe('Environment Variables', () => {
  it('Should return the environment variable', async () => {
    const c = new Context(new Request('http://localhost/'))
    const { NAME } = env<{ NAME: string }>(c)
    expect(NAME).toBe('Node')
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

  const server = createAdaptorServer(app)

  it('Should not authorize, return 401 Response', async () => {
    const res = await request(server).get('/auth/a')
    expect(res.status).toBe(401)
    expect(res.text).toBe('Unauthorized')
  })

  it('Should authorize, return 200 Response', async () => {
    const credential = 'aG9uby11c2VyLWE6aG9uby1wYXNzd29yZC1h'
    const res = await request(server).get('/auth/a').set('Authorization', `Basic ${credential}`)
    expect(res.status).toBe(200)
    expect(res.text).toBe('auth')
  })
})

describe('JWT Auth Middleware', () => {
  const app = new Hono()

  app.use('/jwt/*', jwt({ secret: 'a-secret' }))
  app.get('/jwt/a', (c) => c.text('auth'))

  const server = createAdaptorServer(app)

  it('Should not authorize, return 401 Response', async () => {
    const res = await request(server).get('/jwt/a')
    expect(res.status).toBe(401)
    expect(res.text).toBe('Unauthorized')
  })

  it('Should authorize, return 200 Response', async () => {
    const credential =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
    const res = await request(server).get('/jwt/a').set('Authorization', `Bearer ${credential}`)
    expect(res.status).toBe(200)
    expect(res.text).toBe('auth')
  })
})

describe('stream', () => {
  const app = new Hono()

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

  const server = createAdaptorServer(app)

  beforeEach(() => {
    aborted = false
  })

  it('Should call onAbort', async () => {
    const req = request(server)
      .get('/stream')
      .end(() => {})

    expect(aborted).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 10))
    req.abort()
    while (!aborted) {
      await new Promise((resolve) => setTimeout(resolve))
    }
    expect(aborted).toBe(true)
  })

  it('Should not be called onAbort if already closed', async () => {
    expect(aborted).toBe(false)
    const res = await request(server).get('/streamHello')
    expect(res.status).toBe(200)
    expect(res.text).toBe('Hello')
    expect(aborted).toBe(false)
  })
})

describe('streamSSE', () => {
  const app = new Hono()

  let aborted = false

  app.get('/stream', (c) => {
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      return new Promise<void>((resolve) => {
        stream.onAbort(resolve)
      })
    })
  })
  app.get('/streamHello', (c) => {
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      await stream.write('Hello')
    })
  })

  const server = createAdaptorServer(app)

  beforeEach(() => {
    aborted = false
  })

  it('Should call onAbort', async () => {
    const req = request(server)
      .get('/stream')
      .end(() => {})

    expect(aborted).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 10))
    req.abort()
    while (!aborted) {
      await new Promise((resolve) => setTimeout(resolve))
    }
    expect(aborted).toBe(true)
  })

  it('Should not be called onAbort if already closed', async () => {
    expect(aborted).toBe(false)
    const res = await request(server).get('/streamHello')
    expect(res.status).toBe(200)
    expect(res.text).toBe('Hello')
    expect(aborted).toBe(false)
  })
})

describe('compress', async () => {
  const cssContent = Array.from({ length: 60 }, () => 'body { color: red; }').join('\n')
  const [externalServer, serverInfo] = await new Promise<[Server, AddressInfo]>((resolve) => {
    const externalApp = new Hono()
    externalApp.get('/style.css', (c) =>
      c.text(cssContent, {
        headers: {
          'Content-Type': 'text/css',
        },
      })
    )
    const server = serve(
      {
        fetch: externalApp.fetch,
        port: 0,
        hostname: '0.0.0.0',
      },
      (serverInfo) => {
        resolve([server as Server, serverInfo])
      }
    )
  })

  const app = new Hono()
  app.use(compress())
  app.get('/fetch/:file', (c) => {
    return fetch(`http://${serverInfo.address}:${serverInfo.port}/${c.req.param('file')}`)
  })
  const server = createAdaptorServer(app)

  afterAll(() => {
    externalServer.close()
  })

  it('Should be compressed a fetch response', async () => {
    const res = await request(server).get('/fetch/style.css')
    expect(res.status).toBe(200)
    expect(res.headers['content-encoding']).toBe('gzip')
    expect(res.text).toBe(cssContent)
  })
})
