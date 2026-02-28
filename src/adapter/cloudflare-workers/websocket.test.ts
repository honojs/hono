import { Hono } from '../..'
import { Context } from '../../context'
import { upgradeWebSocket } from '.'

// CloseEvent is not available in Node.js/vitest
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).CloseEvent ??= class CloseEvent extends Event {
  code: number
  reason: string
  wasClean: boolean
  constructor(type: string, init?: { code?: number; reason?: string; wasClean?: boolean }) {
    super(type)
    this.code = init?.code ?? 0
    this.reason = init?.reason ?? ''
    this.wasClean = init?.wasClean ?? false
  }
}

/**
 * Creates a mock WebSocketPair for testing.
 * Returns the mock server (EventTarget with WebSocket-like methods)
 * and a mock client object, and installs the global WebSocketPair.
 */
function createMockWebSocketPair() {
  const server = new EventTarget() as EventTarget & {
    accept: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    send: ReturnType<typeof vi.fn>
    protocol: string
    readyState: number
    url: string | null
  }
  server.accept = vi.fn()
  server.close = vi.fn()
  server.send = vi.fn()
  server.protocol = ''
  server.readyState = 1
  server.url = null

  const client = {} as WebSocket

  // @ts-expect-error Cloudflare API
  globalThis.WebSocketPair = class {
    0: WebSocket
    1: WebSocket
    constructor() {
      this[0] = client
      this[1] = server as unknown as WebSocket
    }
  }

  return { server, client }
}

describe('upgradeWebSocket middleware', () => {
  it('Should receive message and readyState is valid', async () => {
    const { server } = createMockWebSocketPair()

    const app = new Hono()
    const wsPromise = new Promise((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage(evt, ws) {
            resolve([evt.data, ws.readyState])
          },
        }))
      )
    )

    const sendingData = Math.random().toString()
    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new MessageEvent('message', { data: sendingData }))

    expect([sendingData, 1]).toStrictEqual(await wsPromise)
  })

  it('Should call next() when header does not have upgrade', async () => {
    createMockWebSocketPair()
    const next = vi.fn()
    await upgradeWebSocket(() => ({}))(
      new Context(
        new Request('http://localhost', {
          headers: { Upgrade: 'example' },
        })
      ),
      next
    )
    expect(next).toBeCalled()
  })

  it('Should return a 101 response with webSocket set to the client', async () => {
    const { server, client } = createMockWebSocketPair()

    // In Cloudflare Workers, new Response(null, { status: 101, webSocket }) is valid,
    // but Node.js restricts status to 200-599. Mock Response to simulate the CF runtime.
    const OriginalResponse = globalThis.Response
    globalThis.Response = class MockResponse {
      status: number
      webSocket: WebSocket
      constructor(
        _body: BodyInit | null,
        init?: { status?: number; webSocket?: WebSocket } & ResponseInit
      ) {
        this.status = init?.status ?? 200
        this.webSocket = init?.webSocket as WebSocket
      }
    } as unknown as typeof Response

    try {
      const c = new Context(
        new Request('http://localhost/ws', {
          headers: { Upgrade: 'websocket' },
        })
      )
      const res = await upgradeWebSocket(c, {})

      expect(res.status).toBe(101)
      // @ts-expect-error - webSocket is Cloudflare-specific
      expect(res.webSocket).toBe(client)
      expect(server.accept).toHaveBeenCalled()
    } finally {
      globalThis.Response = OriginalResponse
    }
  })

  it('Should call server.accept() during upgrade', async () => {
    const { server } = createMockWebSocketPair()

    const app = new Hono()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })

    expect(server.accept).toHaveBeenCalled()
  })

  it('Should trigger onClose handler when server receives close event', async () => {
    const { server } = createMockWebSocketPair()

    const app = new Hono()
    const closePromise = new Promise<{ code: number; reason: string }>((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onClose(evt) {
            resolve({ code: (evt as CloseEvent).code, reason: (evt as CloseEvent).reason })
          },
        }))
      )
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new CloseEvent('close', { code: 1000, reason: 'Normal' }))

    const result = await closePromise
    expect(result.code).toBe(1000)
    expect(result.reason).toBe('Normal')
  })

  it('Should trigger onError handler when server receives error event', async () => {
    const { server } = createMockWebSocketPair()

    const app = new Hono()
    const errorPromise = new Promise<string>((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onError(evt) {
            resolve(evt.type)
          },
        }))
      )
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new Event('error'))

    expect(await errorPromise).toBe('error')
  })

  it('Should not add event listeners when handlers are not provided', async () => {
    const { server } = createMockWebSocketPair()
    const addEventListenerSpy = vi.spyOn(server, 'addEventListener')

    const app = new Hono()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })

    // No onMessage, onClose, or onError provided — no listeners should be added
    expect(addEventListenerSpy).not.toHaveBeenCalled()
  })

  it('Should delegate send() to server.send() via WSContext', async () => {
    const { server } = createMockWebSocketPair()

    const app = new Hono()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({
        onMessage(_evt, ws) {
          ws.send('echo')
        },
      }))
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new MessageEvent('message', { data: 'hello' }))

    expect(server.send).toHaveBeenCalledWith('echo')
  })

  it('Should delegate close() to server.close() via WSContext', async () => {
    const { server } = createMockWebSocketPair()

    const app = new Hono()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({
        onMessage(_evt, ws) {
          ws.close(1000, 'Done')
        },
      }))
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new MessageEvent('message', { data: 'trigger close' }))

    expect(server.close).toHaveBeenCalledWith(1000, 'Done')
  })

  it('Should expose server.protocol through WSContext', async () => {
    const { server } = createMockWebSocketPair()
    server.protocol = 'graphql-ws'

    const app = new Hono()
    const protocolPromise = new Promise<string | null>((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage(_evt, ws) {
            resolve(ws.protocol)
          },
        }))
      )
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new MessageEvent('message', { data: 'test' }))

    expect(await protocolPromise).toBe('graphql-ws')
  })

  it('Should expose server.readyState through WSContext', async () => {
    const { server } = createMockWebSocketPair()
    server.readyState = 1 // OPEN

    const app = new Hono()
    const readyStatePromise = new Promise<number>((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage(_evt, ws) {
            resolve(ws.readyState)
          },
        }))
      )
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new MessageEvent('message', { data: 'test' }))

    expect(await readyStatePromise).toBe(1)
  })

  it('Should expose server.url as URL through WSContext when present', async () => {
    const { server } = createMockWebSocketPair()
    server.url = 'wss://example.com/ws'

    const app = new Hono()
    const urlPromise = new Promise<URL | null>((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage(_evt, ws) {
            resolve(ws.url)
          },
        }))
      )
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new MessageEvent('message', { data: 'test' }))

    const url = await urlPromise
    expect(url).toBeInstanceOf(URL)
    expect(url!.href).toBe('wss://example.com/ws')
  })

  it('Should set WSContext.url to null when server.url is falsy', async () => {
    const { server } = createMockWebSocketPair()
    server.url = null

    const app = new Hono()
    const urlPromise = new Promise<URL | null>((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage(_evt, ws) {
            resolve(ws.url)
          },
        }))
      )
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new MessageEvent('message', { data: 'test' }))

    expect(await urlPromise).toBeNull()
  })

  it('Should set WSContext.raw to the server WebSocket', async () => {
    const { server } = createMockWebSocketPair()

    const app = new Hono()
    const rawPromise = new Promise<unknown>((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage(_evt, ws) {
            resolve(ws.raw)
          },
        }))
      )
    )

    await app.request('/ws', {
      headers: { Upgrade: 'websocket' },
    })
    server.dispatchEvent(new MessageEvent('message', { data: 'test' }))

    expect(await rawPromise).toBe(server)
  })
})
