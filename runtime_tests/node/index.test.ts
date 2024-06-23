import { createAdaptorServer } from '@hono/node-server'
import request from 'supertest'
import { Hono } from '../../src'
import { Context } from '../../src/context'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import { basicAuth } from '../../src/middleware/basic-auth'
import { jwt } from '../../src/middleware/jwt'
import { HonoRequest } from '../../src/request'
import { stream, streamSSE } from '../../src/helper/streaming'
import { getConnInfo } from '../../src/adapter/node/conninfo'

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
    const c = new Context(new HonoRequest(new Request('http://localhost/')))
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

  const server = createAdaptorServer(app)

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

  const server = createAdaptorServer(app)

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
})

describe('ConnInfo', () => {
  const app = new Hono()

  app.get('/', (c) => c.json(getConnInfo(c)))

  const server = createAdaptorServer(app)
  server.listen(0, '127.0.0.1')

  it('Should return correct connection info', async () => {
    const res = await request(server).get('/')
    expect(res.status).toBe(200)
    const info = JSON.parse(res.text).remote
    expect(info).toEqual({
      addressType: 'IPv4',
      address: '127.0.0.1',
      port: expect.any(Number),
    })
  })

  it('Should throw error if no incoming object is provided', () => {
    expect(() =>
      getConnInfo(new Context(new HonoRequest(new Request('http://localhost/'))))
    ).toThrow()
  })
})
