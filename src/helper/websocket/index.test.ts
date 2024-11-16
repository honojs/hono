import { Context } from '../../context'
import type { WSContextInit } from '.'
import { WSContext, createWSMessageEvent, defineWebSocketHelper } from '.'

describe('`createWSMessageEvent`', () => {
  it('Should `createWSMessageEvent` is working for string', () => {
    const randomString = Math.random().toString()
    const event = createWSMessageEvent(randomString)

    expect(event.data).toBe(randomString)
  })
  it('Should `createWSMessageEvent` type is `message`', () => {
    const event = createWSMessageEvent('')
    expect(event.type).toBe('message')
  })
})
describe('defineWebSocketHelper', () => {
  it('defineWebSocketHelper should work', async () => {
    const upgradeWebSocket = defineWebSocketHelper(() => {
      return new Response('Hello World', {
        status: 200,
      })
    })
    const response = await upgradeWebSocket(() => ({}))(
      new Context(new Request('http://localhost')),
      () => Promise.resolve()
    )
    expect(response).toBeTruthy()
    expect((response as Response).status).toBe(200)
  })
  it('When response is undefined, should call next()', async () => {
    const upgradeWebSocket = defineWebSocketHelper(() => {
      return
    })
    const next = vi.fn()
    await upgradeWebSocket(() => ({}))(new Context(new Request('http://localhost')), next)
    expect(next).toBeCalled()
  })
})
describe('WSContext', () => {
  it('Should close() works', async () => {
    type Result = [number | undefined, string | undefined]
    let ws!: WSContext
    const promise = new Promise<Result>((resolve) => {
      ws = new WSContext({
        close(code, reason) {
          resolve([code, reason])
        },
      } as WSContextInit)
    })
    ws.close(0, 'reason')
    const [code, reason] = await promise
    expect(code).toBe(0)
    expect(reason).toBe('reason')
  })
  it('Should send() works', async () => {
    let ws!: WSContext
    const promise = new Promise<string | ArrayBuffer>((resolve) => {
      ws = new WSContext({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        send(data, _options) {
          resolve(data)
        },
      } as WSContextInit)
    })
    ws.send('Hello')
    expect(await promise).toBe('Hello')
  })
  it('Should readyState works', () => {
    const ws = new WSContext({
      readyState: 0,
    } as WSContextInit)
    expect(ws.readyState).toBe(0)
  })
  it('Should normalize URL', () => {
    const stringURLWS = new WSContext({
      url: 'http://localhost',
    } as WSContextInit)
    expect(stringURLWS.url).toBeInstanceOf(URL)

    const urlURLWS = new WSContext({
      url: new URL('http://localhost'),
    } as WSContextInit)
    expect(urlURLWS.url).toBeInstanceOf(URL)

    const nullURLWS = new WSContext({
      url: undefined,
    } as WSContextInit)
    expect(nullURLWS.url).toBeNull()
  })
  it('Should normalize message in send()', () => {
    let data: string | ArrayBuffer | Uint8Array | null = null
    const wsContext = new WSContext({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      send(received, _options) {
        data = received
      },
    } as WSContextInit)

    wsContext.send('string')
    expect(data).toBe('string')

    wsContext.send(new ArrayBuffer(16))
    expect(data).toBeInstanceOf(ArrayBuffer)

    wsContext.send(new Uint8Array(16))
    expect(data).toBeInstanceOf(Uint8Array)
  })
})
