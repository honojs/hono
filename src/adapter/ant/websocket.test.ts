import { Hono } from '../..'
import { Context } from '../../context'
import type { AntUpgradeWebSocketOptions } from './websocket'
import { createWSContext, upgradeWebSocket } from './websocket'

const createAntServer = () => {
  const socket = new EventTarget() as WebSocket
  const response = new Response()
  let passedOptions: AntUpgradeWebSocketOptions | undefined
  const server = {
    upgradeWebSocket(_req: Request, options?: AntUpgradeWebSocketOptions) {
      passedOptions = options
      return { response, socket }
    },
  }
  return {
    socket,
    response,
    server,
    get passedOptions() {
      return passedOptions
    },
  }
}

describe('createWSContext()', () => {
  it('Should send(), close(), protocol, readyState and url work', () => {
    const send = vi.fn()
    const close = vi.fn()
    const socket = {
      send,
      close,
      protocol: 'chat',
      readyState: 1,
    } as unknown as WebSocket
    const ws = createWSContext(socket, new URL('http://localhost/ws'))

    ws.send('message')
    expect(send).toHaveBeenCalledWith('message')
    ws.close(1000, 'bye')
    expect(close).toHaveBeenCalledWith(1000, 'bye')
    expect(ws.protocol).toBe('chat')
    expect(ws.readyState).toBe(1)
    expect(ws.url?.pathname).toBe('/ws')
    expect(ws.raw).toBe(socket)
  })
})

describe('upgradeWebSocket()', () => {
  let app: Hono
  beforeEach(() => {
    app = new Hono()
  })

  it('Should return the upgrade response from the server', async () => {
    const { server, response } = createAntServer()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )
    const res = await app.request('/ws', { headers: { upgrade: 'websocket' } }, server)
    expect(res).toBe(response)
  })

  it('Should accept { server } as env', async () => {
    const { server, response } = createAntServer()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )
    const res = await app.request('/ws', { headers: { upgrade: 'websocket' } }, { server })
    expect(res).toBe(response)
  })

  it('Should throw error when server is missing', async () => {
    const run = async () =>
      await upgradeWebSocket(() => ({}))(
        new Context(new Request('http://localhost', { headers: { upgrade: 'websocket' } }), {
          env: { server: null },
        }),
        () => Promise.resolve()
      )

    await expect(run).rejects.toThrowError(/env has/)
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

  it('Should receive data is valid', async () => {
    const { server, socket } = createAntServer()
    const messagePromise = new Promise((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage: (evt) => resolve(evt.data),
        }))
      )
    )
    await app.request('/ws', { headers: { upgrade: 'websocket' } }, server)
    const data = Math.random().toString()
    socket.dispatchEvent(new MessageEvent('message', { data }))
    expect(await messagePromise).toBe(data)
  })

  it('Should convert binary messages to ArrayBuffer', async () => {
    const { server, socket } = createAntServer()
    const messagePromise = new Promise((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage: (evt) => resolve(evt.data),
        }))
      )
    )
    await app.request('/ws', { headers: { upgrade: 'websocket' } }, server)
    const bytes = new Uint8Array(new ArrayBuffer(32), 8, 16)
    socket.dispatchEvent(new MessageEvent('message', { data: bytes }))
    const received = (await messagePromise) as ArrayBuffer
    expect(received).toBeInstanceOf(ArrayBuffer)
    expect(received.byteLength).toBe(16)
  })

  it('Should call onOpen, onClose and onError with the WSContext', async () => {
    const { server, socket } = createAntServer()
    const open = vi.fn()
    const close = vi.fn()
    const error = vi.fn()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({
        onOpen: (_evt, ws) => open(ws.url?.pathname),
        onClose: (_evt, ws) => close(ws.raw),
        onError: (_evt, ws) => error(ws.raw),
      }))
    )
    await app.request('/ws', { headers: { upgrade: 'websocket' } }, server)
    socket.dispatchEvent(new Event('open'))
    socket.dispatchEvent(new Event('close'))
    socket.dispatchEvent(new Event('error'))
    expect(open).toHaveBeenCalledWith('/ws')
    expect(close).toHaveBeenCalledWith(socket)
    expect(error).toHaveBeenCalledWith(socket)
  })

  it('Should pass the first Sec-WebSocket-Protocol value as the protocol option', async () => {
    const ant = createAntServer()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )
    await app.request(
      '/ws',
      {
        headers: {
          upgrade: 'websocket',
          'sec-websocket-protocol': 'rivet, rivet_target.actor, rivet_actor.19c4f9038947cdcb',
        },
      },
      ant.server
    )
    expect(ant.passedOptions?.protocol).toBe('rivet')
  })

  it('Should not set the protocol option when Sec-WebSocket-Protocol is absent', async () => {
    const ant = createAntServer()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )
    await app.request('/ws', { headers: { upgrade: 'websocket' } }, ant.server)
    expect(ant.passedOptions?.protocol).toBeUndefined()
  })

  it('Should let an explicit protocol option take precedence over the request header', async () => {
    const ant = createAntServer()
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}), { protocol: 'user-chosen' })
    )
    await app.request(
      '/ws',
      {
        headers: {
          upgrade: 'websocket',
          'sec-websocket-protocol': 'header-value',
        },
      },
      ant.server
    )
    expect(ant.passedOptions?.protocol).toBe('user-chosen')
  })
})
