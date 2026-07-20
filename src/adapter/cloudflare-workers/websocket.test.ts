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
    expect(next).toHaveBeenCalled()
  })

  const closePromise = new Promise((resolve) =>
    app.get(
      '/ws-close',
      upgradeWebSocket(() => ({
        onClose(evt, ws) {
          resolve(true)
        },
      }))
    )
  )

  it('Should call onClose when close event fires', async () => {
    await app.request('/ws-close', {
      headers: {
        Upgrade: 'websocket',
      },
    })

    server.dispatchEvent(new Event('close'))

    expect(await closePromise).toBe(true)
  })

  const error = new Promise((resolve) => {
    app.get(
      '/ws-error',
      upgradeWebSocket(() => ({
        onError(evt, ws) {
          resolve(true)
        },
      }))
    )
  })

  it('Should call onError when error event fires', async () => {
    await app.request('/ws-error', {
      headers: {
        Upgrade: 'websocket',
      },
    })

    server.dispatchEvent(new Event('error'))
    expect(await error).toBe(true)
  })

  const sendWsRef: Promise<any> = new Promise((resolve) =>
    app.get(
      '/ws-send',
      upgradeWebSocket(() => ({
        onMessage(evt, ws) {
          resolve(ws)
        },
      }))
    )
  )

  it('Should call server.send when ws.send is called', async () => {
    // @ts-expect-error adding a mock method for the test
    server.send = vi.fn()

    await app.request('/ws-send', {
      headers: {
        Upgrade: 'websocket',
      },
    })
    server.dispatchEvent(new MessageEvent('message', { data: 'trigger' }))

    const ws = await sendWsRef
    ws.send('hello')

    // @ts-expect-error mock method
    expect(server.send).toHaveBeenCalledWith('hello')
  })

  const closeWsRef: Promise<any> = new Promise((resolve) =>
    app.get(
      '/ws-close-call',
      upgradeWebSocket(() => ({
        onMessage(evt, ws) {
          resolve(ws)
        },
      }))
    )
  )

  it('Should call server.close when ws.close is called', async () => {
    // @ts-expect-error adding a mock method for the test
    server.close = vi.fn()

    await app.request('/ws-close-call', {
      headers: {
        Upgrade: 'websocket',
      },
    })
    server.dispatchEvent(new MessageEvent('message', { data: 'trigger' }))

    const ws = await closeWsRef
    ws.close(1000, 'done')

    // @ts-expect-error mock method
    expect(server.close).toHaveBeenCalledWith(1000, 'done')
  })
})
