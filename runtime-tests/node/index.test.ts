import { createAdaptorServer, serve } from '@hono/node-server'
import { once } from 'node:events'
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

  const agent = createAgent(app)

  it('Should return 200 response', async () => {
    const res = await agent.get('/')
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('Hello! Node.js!')
  })

  it('Should return correct runtime name', async () => {
    const res = await agent.get('/runtime-name')
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('node')
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

  const agent = createAgent(app)

  it('Should not authorize, return 401 Response', async () => {
    const res = await agent.get('/auth/a')
    expect(res.status).toBe(401)
    await expect(res.text()).resolves.toBe('Unauthorized')
  })

  it('Should authorize, return 200 Response', async () => {
    const credential = 'aG9uby11c2VyLWE6aG9uby1wYXNzd29yZC1h'
    const res = await agent.get('/auth/a', { headers: { Authorization: `Basic ${credential}` } })
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('auth')
  })
})

describe('JWT Auth Middleware', () => {
  const app = new Hono()

  app.use('/jwt/*', jwt({ secret: 'a-secret', alg: 'HS256' }))
  app.get('/jwt/a', (c) => c.text('auth'))

  const agent = createAgent(app)

  it('Should not authorize, return 401 Response', async () => {
    const res = await agent.get('/jwt/a')
    expect(res.status).toBe(401)
    await expect(res.text()).resolves.toBe('Unauthorized')
  })

  it('Should authorize, return 200 Response', async () => {
    const credential =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
    const res = await agent.get('/jwt/a', { headers: { Authorization: `Bearer ${credential}` } })
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('auth')
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

  const agent = createAgent(app)

  beforeEach(() => {
    aborted = false
  })

  it('Should call onAbort', async () => {
    const controller = new AbortController()
    const req = agent.get('/stream', { signal: controller.signal })

    expect(aborted).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 10))
    controller.abort()
    await req.catch(() => {})
    while (!aborted) {
      await new Promise((resolve) => setTimeout(resolve))
    }
    expect(aborted).toBe(true)
  })

  it('Should not be called onAbort if already closed', async () => {
    expect(aborted).toBe(false)
    const res = await agent.get('/streamHello')
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('Hello')
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

  const agent = createAgent(app)

  beforeEach(() => {
    aborted = false
  })

  it('Should call onAbort', async () => {
    const controller = new AbortController()
    const req = agent.get('/stream', { signal: controller.signal })

    expect(aborted).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 10))
    controller.abort()
    await req.catch(() => {})
    while (!aborted) {
      await new Promise((resolve) => setTimeout(resolve))
    }
    expect(aborted).toBe(true)
  })

  it('Should not be called onAbort if already closed', async () => {
    expect(aborted).toBe(false)
    const res = await agent.get('/streamHello')
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('Hello')
    expect(aborted).toBe(false)
  })
})

describe('streamSSE lifecycle (Last-Event-ID + write-after-abort)', () => {
  const events = ['alpha', 'beta', 'gamma', 'delta']
  const app = new Hono()

  let handlerDone = false
  let writesAfterAbort = 0

  // Replays only the events after the Last-Event-ID cursor, as an EventSource
  // reconnect would expect.
  app.get('/feed', (c) =>
    streamSSE(c, async (stream) => {
      const cursor = Number(stream.lastEventId ?? 0)
      for (let i = cursor; i < events.length; i++) {
        await stream.writeSSE({ data: events[i], id: String(i + 1) })
      }
    })
  )

  app.get('/abrupt', (c) =>
    streamSSE(c, async (stream) => {
      await stream.writeSSE({ data: 'one', id: '1' })
      // The client disconnects during this window; keep producing.
      await stream.sleep(20)
      for (let i = 2; i <= 4; i++) {
        await stream.writeSSE({ data: `dropped-${i}`, id: String(i) })
        writesAfterAbort++
      }
      handlerDone = true
    })
  )

  const agent = createAgent(app)

  beforeEach(() => {
    handlerDone = false
    writesAfterAbort = 0
  })

  const readEvents = async (res: Response, count: number): Promise<string[]> => {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    const out: string[] = []
    let buffer = ''
    while (out.length < count) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        const data = /^data: (.*)$/m.exec(frame)?.[1]
        if (data !== undefined) {
          out.push(data)
        }
      }
    }
    reader.releaseLock()
    return out
  }

  it('Should resume from the Last-Event-ID header after a reconnect', async () => {
    // First connection: the client reads two events, then drops.
    const first = await agent.get('/feed')
    expect(await readEvents(first, 2)).toEqual(['alpha', 'beta'])
    await first.body!.cancel()

    // Reconnect with the id of the last received event: only later events replay.
    const second = await agent.get('/feed', { headers: { 'Last-Event-ID': '2' } })
    expect(await readEvents(second, 2)).toEqual(['gamma', 'delta'])
    await second.body!.cancel()
  })

  it('Should resume from the beginning without a Last-Event-ID header', async () => {
    const res = await agent.get('/feed')
    expect(await readEvents(res, 4)).toEqual(['alpha', 'beta', 'gamma', 'delta'])
    await res.body!.cancel()
  })

  it('Should let the handler finish cleanly when the client disconnects mid-stream', async () => {
    const controller = new AbortController()
    const res = await agent.get('/abrupt', { signal: controller.signal })
    expect(await readEvents(res, 1)).toEqual(['one'])
    controller.abort()
    await res.body!.cancel().catch(() => {})

    // Writes after the disconnect are no-ops; the handler must still complete.
    const deadline = Date.now() + 2000
    while (!handlerDone && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    expect(handlerDone).toBe(true)
    expect(writesAfterAbort).toBe(3)
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
  const agent = createAgent(app)

  afterAll(() => {
    externalServer.close()
  })

  it('Should be compressed a fetch response', async () => {
    const res = await agent.get('/fetch/style.css')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBe('gzip')
    await expect(res.text()).resolves.toBe(cssContent)
  })
})

describe('Buffers', () => {
  const app = new Hono()
    .get('/', async (c) => {
      return c.body(Buffer.from('hello'))
    })
    .get('/uint8array', async (c) => {
      return c.body(Uint8Array.from('hello'.split(''), (c) => c.charCodeAt(0)))
    })

  const agent = createAgent(app)

  it('should allow returning buffers', async () => {
    const res = await agent.get('/')
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('hello')
  })

  it('should allow returning uint8array as well', async () => {
    const res = await agent.get('/uint8array')
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('hello')
  })
})

function createAgent(app: Hono) {
  const server = createAdaptorServer(app)
  const listening = once(server.listen(), 'listening')

  return {
    async get(path: string, init?: RequestInit) {
      await listening
      const url = new URL(path, getOrigin())
      return fetch(url, init)
    },
  }

  function getOrigin(): string {
    let address = server.address()

    if (typeof address === 'object') {
      address = address?.port ? `http://localhost:${address.port}` : 'http://localhost'
    }

    return address
  }
}
