import { Context, Hono } from 'hono'
import { createHibernationWebSocket, upgradeWebSocket } from '.'

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

describe('createHibernationWebSocket', () => {
  const createState = () => {
    const tags = new Map<WebSocket, string[]>()
    return {
      acceptWebSocket: vi.fn((ws: WebSocket, wsTags?: string[]) => {
        tags.set(ws, wsTags ?? [])
      }),
      getTags: (ws: WebSocket) => tags.get(ws) ?? [],
    }
  }

  const createEvents = () => ({ onMessage: vi.fn(), onClose: vi.fn(), onError: vi.fn() })

  const upgrade = (app: Hono, path: string) =>
    app.request(path, {
      headers: {
        Upgrade: 'websocket',
      },
    })

  beforeAll(() => {
    // @ts-expect-error Cloudflare API
    globalThis.WebSocketPair = class {
      0 = {} as WebSocket
      1 = { send: vi.fn(), close: vi.fn(), readyState: 1 } as unknown as WebSocket
    }
  })

  it('Should call next() when header does not have upgrade', async () => {
    const state = createState()
    const next = vi.fn()
    await createHibernationWebSocket(state).upgrade({})(
      new Context(new Request('http://localhost')),
      next
    )
    expect(next).toHaveBeenCalled()
    expect(state.acceptWebSocket).not.toHaveBeenCalled()
  })

  it('Should accept the WebSocket with the tags', async () => {
    const state = createState()
    const ws = createHibernationWebSocket(state)
    const app = new Hono()
      .get('/chat', ws.upgrade({}, { tags: ['chat'] }))
      .get('/users/:name', ws.upgrade({}, { tags: (c) => [`user:${c.req.param('name')}`] }))

    await upgrade(app, '/chat')
    await upgrade(app, '/users/alice')

    expect(state.acceptWebSocket.mock.calls[0][1]).toEqual(['hono:0', 'chat'])
    expect(state.acceptWebSocket.mock.calls[1][1]).toEqual(['hono:1', 'user:alice'])
  })

  it('Should pass an event to the events of the route that accepted the WebSocket', async () => {
    const state = createState()
    const ws = createHibernationWebSocket(state)
    const chat = createEvents()
    const admin = createEvents()
    const app = new Hono().get('/chat', ws.upgrade(chat)).get('/admin', ws.upgrade(admin))

    await upgrade(app, '/admin')
    const socket = state.acceptWebSocket.mock.calls[0][0]

    ws.message(socket, 'Hello')
    ws.close(socket, 1000, 'done', true)
    const error = new Error('error')
    ws.error(socket, error)

    expect(chat.onMessage).not.toHaveBeenCalled()
    expect(admin.onMessage.mock.calls[0][0].data).toBe('Hello')
    expect(admin.onMessage.mock.calls[0][1].raw).toBe(socket)
    expect(admin.onClose.mock.calls[0][0]).toMatchObject({
      code: 1000,
      reason: 'done',
      wasClean: true,
    })
    expect(admin.onError.mock.calls[0][0].error).toBe(error)

    admin.onMessage.mock.calls[0][1].send('Hi')
    expect(socket.send).toHaveBeenCalledWith('Hi')
  })

  it('Should find the events after the Durable Object is created again', async () => {
    const state = createState()
    const first = createHibernationWebSocket(state)
    const app = new Hono()
      .get('/chat', first.upgrade(createEvents()))
      .get('/admin', first.upgrade(createEvents()))
    await upgrade(app, '/admin')
    const socket = state.acceptWebSocket.mock.calls[0][0]

    const second = createHibernationWebSocket(state)
    const chat = createEvents()
    const admin = createEvents()
    second.upgrade(chat)
    second.upgrade(admin)
    second.message(socket, 'Hello')

    expect(chat.onMessage).not.toHaveBeenCalled()
    expect(admin.onMessage.mock.calls[0][0].data).toBe('Hello')
  })

  it('Should ignore a WebSocket that the helper did not accept', () => {
    const state = createState()
    const ws = createHibernationWebSocket(state)
    const events = createEvents()
    ws.upgrade(events)

    const socket = {} as WebSocket
    state.acceptWebSocket(socket, ['chat'])
    ws.message(socket, 'Hello')

    expect(events.onMessage).not.toHaveBeenCalled()
  })
})
