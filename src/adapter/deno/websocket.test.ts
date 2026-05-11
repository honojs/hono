import { Hono } from '../..'
import { Context } from '../../context'
import { upgradeWebSocket } from './websocket'

globalThis.Deno = {} as typeof Deno

describe('WebSockets', () => {
  let app: Hono
  beforeEach(() => {
    app = new Hono()
  })

  it('Should receive data is valid', async () => {
    const messagePromise = new Promise((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage: (evt) => resolve(evt.data),
        }))
      )
    )
    const socket = new EventTarget() as WebSocket
    Deno.upgradeWebSocket = () => {
      return {
        response: new Response(),
        socket,
      }
    }
    await app.request('/ws', {
      headers: {
        upgrade: 'websocket',
      },
    })
    const data = Math.random().toString()
    socket.onmessage &&
      socket.onmessage(
        new MessageEvent('message', {
          data,
        })
      )
    expect(await messagePromise).toBe(data)
  })

  it('Should receive data is valid with Options', async () => {
    const messagePromise = new Promise((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(
          () => ({
            onMessage: (evt) => resolve(evt.data),
          }),
          {
            idleTimeout: 5000,
          }
        )
      )
    )
    const socket = new EventTarget() as WebSocket
    Deno.upgradeWebSocket = () => {
      return {
        response: new Response(),
        socket,
      }
    }
    await app.request('/ws', {
      headers: {
        upgrade: 'websocket',
      },
    })
    const data = Math.random().toString()
    socket.onmessage &&
      socket.onmessage(
        new MessageEvent('message', {
          data,
        })
      )
    expect(await messagePromise).toBe(data)
  })

  it('Should pass first requested protocol to Deno.upgradeWebSocket', async () => {
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )
    const socket = new EventTarget() as WebSocket
    let upgradeOptions: Deno.UpgradeWebSocketOptions | undefined
    Deno.upgradeWebSocket = (_request, options) => {
      upgradeOptions = options
      return {
        response: new Response(),
        socket,
      }
    }

    await app.request('/ws', {
      headers: {
        upgrade: 'websocket',
        'sec-websocket-protocol': 'chat, superchat',
      },
    })

    expect(upgradeOptions).toEqual({
      protocol: 'chat',
    })
  })

  it('Should not override protocol provided in options', async () => {
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}), { protocol: 'superchat', idleTimeout: 5000 })
    )
    const socket = new EventTarget() as WebSocket
    let upgradeOptions: Deno.UpgradeWebSocketOptions | undefined
    Deno.upgradeWebSocket = (_request, options) => {
      upgradeOptions = options
      return {
        response: new Response(),
        socket,
      }
    }

    await app.request('/ws', {
      headers: {
        upgrade: 'websocket',
        'sec-websocket-protocol': 'chat',
      },
    })

    expect(upgradeOptions).toEqual({
      idleTimeout: 5000,
      protocol: 'superchat',
    })
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
