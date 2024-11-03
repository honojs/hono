import { Hono } from '../..'
import { Context } from '../../context'
import { upgradeWebSocket } from '.'

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
