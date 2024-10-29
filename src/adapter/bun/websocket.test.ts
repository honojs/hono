import { Context } from '../../context'
import type { BunWebSocketData, BunServerWebSocket } from './websocket'
import { createWSContext, createBunWebSocket } from './websocket'

describe('createWSContext()', () => {
  it('Should send() and close() works', () => {
    const send = vi.fn()
    const close = vi.fn()
    const ws = createWSContext({
      send(data) {
        send(data)
      },
      close(code, reason) {
        close(code, reason)
      },
      data: {},
    } as BunServerWebSocket<BunWebSocketData>)
    ws.send('message')
    expect(send).toBeCalled()
    ws.close()
    expect(close).toBeCalled()
  })
})
describe('upgradeWebSocket()', () => {
  it('Should throw error when server is null', async () => {
    const { upgradeWebSocket } = createBunWebSocket()
    const run = async () =>
      await upgradeWebSocket(() => ({}))(
        new Context(new Request('http://localhost'), {
          env: {
            server: null,
          },
        }),
        () => Promise.resolve()
      )

    expect(run).rejects.toThrowError(/env has/)
  })
  it('Should response null when upgraded', async () => {
    const { upgradeWebSocket } = createBunWebSocket()
    const upgraded = await upgradeWebSocket(() => ({}))(
      new Context(new Request('http://localhost'), {
        env: {
          upgrade: () => true,
        },
      }),
      () => Promise.resolve()
    )
    expect(upgraded).toBeTruthy()
  })
  it('Should response undefined when upgrade failed', async () => {
    const { upgradeWebSocket } = createBunWebSocket()
    const upgraded = await upgradeWebSocket(() => ({}))(
      new Context(new Request('http://localhost'), {
        env: {
          upgrade: () => undefined,
        },
      }),
      () => Promise.resolve()
    )
    expect(upgraded).toBeFalsy()
  })
})
describe('createBunWebSocket()', () => {
  beforeAll(() => {
    // @ts-expect-error patch global
    globalThis.CloseEvent = Event
  })
  afterAll(() => {
    // @ts-expect-error patch global
    delete globalThis.CloseEvent
  })
  it('Should events are called', async () => {
    const { websocket, upgradeWebSocket } = createBunWebSocket()

    const open = vi.fn()
    const message = vi.fn()
    const close = vi.fn()

    const ws = {
      data: {
        events: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onOpen(evt, ws) {
            open()
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onMessage(evt, ws) {
            message()
            if (evt.data instanceof ArrayBuffer) {
              receivedArrayBuffer = evt.data
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onClose(evt, ws) {
            close()
          },
        },
      },
    } as BunServerWebSocket<BunWebSocketData>

    let receivedArrayBuffer: ArrayBuffer | undefined = undefined
    await upgradeWebSocket(() => ({}))(
      new Context(new Request('http://localhost'), {
        env: {
          upgrade() {
            return true
          },
        },
      }),
      () => Promise.resolve()
    )

    websocket.open(ws)
    expect(open).toBeCalled()

    websocket.message(ws, 'message')
    expect(message).toBeCalled()

    websocket.message(ws, new Uint8Array(16))
    expect(receivedArrayBuffer).toBeInstanceOf(ArrayBuffer)
    expect(receivedArrayBuffer!.byteLength).toBe(16)

    websocket.close(ws)
    expect(close).toBeCalled()
  })
})
