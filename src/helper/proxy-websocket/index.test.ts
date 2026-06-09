import type { WSContext } from '../websocket'
import { proxyWebsocket } from '.'

class MockWebSocket extends EventTarget {
  url: string
  send = vi.fn()
  close = vi.fn()

  constructor(url: string) {
    super()
    this.url = url
  }
}

describe('Proxy Websocket', () => {
  describe('proxyWebsocket', () => {
    let webSocketMock: ReturnType<typeof vi.fn>
    let upstreamSocket: MockWebSocket

    beforeEach(() => {
      webSocketMock = vi.fn((url: string) => {
        upstreamSocket = new MockWebSocket(url)
        return upstreamSocket
      })
      vi.stubGlobal('WebSocket', webSocketMock)
    })

    afterEach(() => {
      vi.clearAllMocks()
      vi.unstubAllGlobals()
    })

    it('creates an upstream websocket', async () => {
      const events = await proxyWebsocket('ws://example.com/')
      const context = {
        send: vi.fn(),
        close: vi.fn(),
      } as unknown as WSContext

      events.onOpen?.(new Event('open'), context)

      expect(webSocketMock).toHaveBeenCalledWith('ws://example.com/')
    })

    it('creates an upstream websocket on path', async () => {
      const events = await proxyWebsocket('ws://example.com/test')
      const context = {
        send: vi.fn(),
        close: vi.fn(),
      } as unknown as WSContext

      events.onOpen?.(new Event('open'), context)

      expect(webSocketMock).toHaveBeenCalledWith('ws://example.com/test')
    })

    it('creates an upstream websocket using the translated HTTP websocket URL', async () => {
      const events = await proxyWebsocket('http://example.com/')
      const context = {
        send: vi.fn(),
        close: vi.fn(),
      } as unknown as WSContext

      events.onOpen?.(new Event('open'), context)

      expect(webSocketMock).toHaveBeenCalledWith('ws://example.com/')
    })

    it('creates an upstream websocket using the translated HTTPS websocket URL', async () => {
      const events = await proxyWebsocket('https://example.com/')
      const context = {
        send: vi.fn(),
        close: vi.fn(),
      } as unknown as WSContext

      events.onOpen?.(new Event('open'), context)

      expect(webSocketMock).toHaveBeenCalledWith('wss://example.com/')
    })

    it('forwards upstream messages to the downstream context', async () => {
      const events = await proxyWebsocket('ws://example.com/')
      const context = {
        send: vi.fn(),
        close: vi.fn(),
      } as unknown as WSContext

      events.onOpen?.(new Event('open'), context)
      upstreamSocket.dispatchEvent(new MessageEvent('message', { data: 'hello from upstream' }))

      expect(context.send).toHaveBeenCalledWith('hello from upstream')
    })

    it('forwards downstream messages to the upstream websocket', async () => {
      const events = await proxyWebsocket('ws://example.com/')
      const context = {
        send: vi.fn(),
        close: vi.fn(),
      } as unknown as WSContext

      events.onOpen?.(new Event('open'), context)
      events.onMessage?.(new MessageEvent('message', { data: 'hello from client' }), context)

      expect(upstreamSocket.send).toHaveBeenCalledWith('hello from client')
    })

    it('closes the downstream context when the upstream websocket closes', async () => {
      const events = await proxyWebsocket('ws://example.com/')
      const context = {
        send: vi.fn(),
        close: vi.fn(),
      } as unknown as WSContext

      events.onOpen?.(new Event('open'), context)
      upstreamSocket.dispatchEvent(new CloseEvent('close'))

      expect(context.close).toHaveBeenCalledTimes(1)
    })

    it('closes the downstream context when the upstream websocket error', async () => {
      const events = await proxyWebsocket('ws://example.com/')
      const context = {
        send: vi.fn(),
        close: vi.fn(),
      } as unknown as WSContext

      events.onOpen?.(new Event('open'), context)
      upstreamSocket.dispatchEvent(new Event('error'))

      expect(context.close).toHaveBeenCalledTimes(1)
    })

    it('closes the upstream websocket when the downstream context closes', async () => {
      const events = await proxyWebsocket('ws://example.com/')
      const context = {
        send: vi.fn(),
        close: vi.fn(),
      } as unknown as WSContext

      events.onOpen?.(new Event('open'), context)
      events.onClose?.(new CloseEvent('close'), context)

      expect(upstreamSocket.close).toHaveBeenCalledTimes(1)
    })
  })
})
