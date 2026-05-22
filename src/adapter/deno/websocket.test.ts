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

  it('Should pass the first Sec-WebSocket-Protocol value as the protocol option', async () => {
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )
    const socket = new EventTarget() as WebSocket
    let passedOptions: Deno.UpgradeWebSocketOptions | undefined
    Deno.upgradeWebSocket = (_req, options) => {
      passedOptions = options
      return {
        response: new Response(),
        socket,
      }
    }
    await app.request('/ws', {
      headers: {
        upgrade: 'websocket',
        'sec-websocket-protocol': 'rivet, rivet_target.actor, rivet_actor.19c4f9038947cdcb',
      },
    })
    expect(passedOptions?.protocol).toBe('rivet')
  })

  it('Should not set the protocol option when Sec-WebSocket-Protocol is absent', async () => {
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}))
    )
    const socket = new EventTarget() as WebSocket
    let passedOptions: Deno.UpgradeWebSocketOptions | undefined
    Deno.upgradeWebSocket = (_req, options) => {
      passedOptions = options
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
    expect(passedOptions?.protocol).toBeUndefined()
  })

  it('Should let an explicit protocol option take precedence over the request header', async () => {
    app.get(
      '/ws',
      upgradeWebSocket(() => ({}), { protocol: 'user-chosen' })
    )
    const socket = new EventTarget() as WebSocket
    let passedOptions: Deno.UpgradeWebSocketOptions | undefined
    Deno.upgradeWebSocket = (_req, options) => {
      passedOptions = options
      return {
        response: new Response(),
        socket,
      }
    }
    await app.request('/ws', {
      headers: {
        upgrade: 'websocket',
        'sec-websocket-protocol': 'header-value',
      },
    })
    expect(passedOptions?.protocol).toBe('user-chosen')
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
