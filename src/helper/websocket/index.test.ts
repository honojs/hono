import { createWSMessageEvent, defineWebSocketHelper } from '.'
import { Context } from '../../context'
import { HonoRequest } from '../../request'

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
})
