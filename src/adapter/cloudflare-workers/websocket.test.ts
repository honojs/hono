import { Hono } from '../..'
import { Context } from '../../context'
import { upgradeWebSocket, createWSContext, upgradeWebSocketForDO } from '.'

describe('upgradeWebSocket middleware', () => {
  const server = new EventTarget()

  // @ts-expect-error Cloudflare API
  globalThis.WebSocketPair = class {
    0: WebSocket // client
    1: WebSocket // server
    constructor() {
      this[0] = {} as WebSocket
      this[1] = server as WebSocket
    }
  }

  const app = new Hono()

  const wsPromise = new Promise((resolve) =>
    app.get(
      '/ws',
      upgradeWebSocket(() => ({
        onMessage(evt, ws) {
          resolve([evt.data, ws.readyState || 1])
        },
      }))
    )
  )
  it('Should receive message and readyState is valid', async () => {
    const sendingData = Math.random().toString()
    await app.request('/ws', {
      headers: {
        Upgrade: 'websocket',
      },
    })
    server.dispatchEvent(
      new MessageEvent('message', {
        data: sendingData,
      })
    )

    expect([sendingData, 1]).toStrictEqual(await wsPromise)
  })
  it('Should call next() when header does not have upgrade', async () => {
    const next = vi.fn()
    await upgradeWebSocket(() => ({}))(
      new Context(
        new Request('http://localhost', {
          headers: {
            Upgrade: 'example',
          },
        })
      ),
      next
    )
    expect(next).toBeCalled()
  })
})

describe('createWSContext for Hibernation API', () => {
  it('Should wrap WebSocket into WSContext', () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      protocol: 'graphql-ws',
      readyState: 1,
      url: 'wss://example.com/ws',
    } as unknown as WebSocket

    const wsCtx = createWSContext(mockWs)

    expect(wsCtx.protocol).toBe('graphql-ws')
    expect(wsCtx.readyState).toBe(1)
    expect(wsCtx.url?.href).toBe('wss://example.com/ws')
    expect(wsCtx.raw).toBe(mockWs)
  })

  it('Should forward send() to underlying WebSocket', () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      protocol: null,
      readyState: 1,
      url: null,
    } as unknown as WebSocket

    const wsCtx = createWSContext(mockWs)
    wsCtx.send('hello')

    expect(mockWs.send).toHaveBeenCalledWith('hello')
  })

  it('Should forward close() with code and reason', () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      protocol: null,
      readyState: 1,
      url: null,
    } as unknown as WebSocket

    const wsCtx = createWSContext(mockWs)
    wsCtx.close(1000, 'Normal closure')

    expect(mockWs.close).toHaveBeenCalledWith(1000, 'Normal closure')
  })

  it('Should handle null url', () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      protocol: null,
      readyState: 1,
      url: null,
    } as unknown as WebSocket

    const wsCtx = createWSContext(mockWs)

    expect(wsCtx.url).toBe(null)
  })
})

describe('upgradeWebSocketForDO', () => {
  // Store original Response
  const OriginalResponse = globalThis.Response

  beforeAll(() => {
    // @ts-expect-error Cloudflare API mock
    globalThis.WebSocketPair = class {
      0: WebSocket
      1: WebSocket
      constructor() {
        this[0] = { client: true } as unknown as WebSocket
        this[1] = { server: true } as unknown as WebSocket
      }
    }

    // Mock Response to support status 101 (Cloudflare-specific)
    globalThis.Response = class MockResponse {
      status: number
      webSocket: WebSocket | undefined
      constructor(_body: BodyInit | null, init?: ResponseInit & { webSocket?: WebSocket }) {
        this.status = init?.status ?? 200
        this.webSocket = init?.webSocket
      }
    } as unknown as typeof Response
  })

  afterAll(() => {
    globalThis.Response = OriginalResponse
  })

  it('Should return 101 response', () => {
    const mockCtx = { acceptWebSocket: vi.fn() }

    const response = upgradeWebSocketForDO(mockCtx)

    expect(response.status).toBe(101)
  })

  it('Should call acceptWebSocket with server socket', () => {
    const mockCtx = { acceptWebSocket: vi.fn() }

    upgradeWebSocketForDO(mockCtx)

    expect(mockCtx.acceptWebSocket).toHaveBeenCalled()
    const calledWith = mockCtx.acceptWebSocket.mock.calls[0][0]
    expect(calledWith).toHaveProperty('server', true)
  })

  it('Should pass tags to acceptWebSocket', () => {
    const mockCtx = { acceptWebSocket: vi.fn() }

    upgradeWebSocketForDO(mockCtx, { tags: ['room:123', 'user:456'] })

    expect(mockCtx.acceptWebSocket).toHaveBeenCalledWith(expect.anything(), [
      'room:123',
      'user:456',
    ])
  })

  it('Should pass undefined tags when not provided', () => {
    const mockCtx = { acceptWebSocket: vi.fn() }

    upgradeWebSocketForDO(mockCtx)

    expect(mockCtx.acceptWebSocket).toHaveBeenCalledWith(expect.anything(), undefined)
  })

  it('Should attach client WebSocket to response', () => {
    const mockCtx = { acceptWebSocket: vi.fn() }

    const response = upgradeWebSocketForDO(mockCtx)

    // @ts-expect-error Cloudflare-specific property
    expect(response.webSocket).toHaveProperty('client', true)
  })
})
