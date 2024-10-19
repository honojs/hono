import { Context } from '../../context'
import type { WSContestInit} from '.'
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
      } as WSContestInit)
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
      } as WSContestInit)
    })
    ws.send('Hello')
    expect(await promise).toBe('Hello')
  })
  it('Should readyState works', () => {
    const ws = new WSContext({
      readyState: 0,
    } as WSContestInit)
    expect(ws.readyState).toBe(0)
  })
})
