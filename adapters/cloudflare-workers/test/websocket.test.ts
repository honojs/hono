import { unstable_dev } from 'wrangler'
import type { Unstable_DevWorker } from 'wrangler'
import { WebSocket } from 'ws'

describe('upgradeWebSocket on workerd', () => {
  // worker.fetch does not support WebSocket:
  // https://github.com/cloudflare/workers-sdk/issues/4573#issuecomment-1850420973
  it('Should echo a message over the WebSocket connection', async () => {
    const worker = await unstable_dev('./test/worker.ts', {
      config: './test/wrangler.toml',
      experimental: { disableExperimentalWarning: true },
    })
    const ws = new WebSocket(`ws://${worker.address}:${worker.port}/ws`)

    const openHandler = vi.fn()
    const messageHandler = vi.fn()
    const closeHandler = vi.fn()

    await new Promise<void>((resolve) => {
      ws.addEventListener('open', () => {
        openHandler()
        ws.send('Hello')
      })
      ws.addEventListener('message', (event) => {
        messageHandler(event.data)
        ws.close()
      })
      ws.addEventListener('close', () => {
        closeHandler()
        resolve()
      })
    })
    await worker.stop()

    expect(openHandler).toHaveBeenCalled()
    expect(messageHandler).toHaveBeenCalledWith('Hello')
    expect(closeHandler).toHaveBeenCalled()
  })
})

describe('createHibernationWebSocket on workerd', () => {
  let worker: Unstable_DevWorker

  beforeAll(async () => {
    worker = await unstable_dev('./test/worker.ts', {
      config: './test/wrangler.toml',
      experimental: { disableExperimentalWarning: true },
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  const open = async (path: string) => {
    const ws = new WebSocket(`ws://${worker.address}:${worker.port}${path}`)
    await new Promise((resolve) => ws.once('open', resolve))
    return ws
  }

  const nextMessage = (ws: WebSocket) =>
    new Promise<string>((resolve) => ws.once('message', (data) => resolve(String(data))))

  const close = (ws: WebSocket, code?: number, reason?: string) =>
    new Promise<[number, string]>((resolve) => {
      ws.once('close', (code, reason) => resolve([code, String(reason)]))
      ws.close(code, reason)
    })

  it('Should pass a message to the events of each route', async () => {
    const chat1 = await open('/do/chat')
    const chat2 = await open('/do/chat')
    const alice = await open('/do/users/alice')

    const chatMessages = Promise.all([nextMessage(chat1), nextMessage(chat2)])
    chat1.send('Hello')
    expect(await chatMessages).toEqual(['chat: Hello', 'chat: Hello'])

    const aliceMessage = nextMessage(alice)
    alice.send('Hi')
    expect(await aliceMessage).toBe('user:alice: Hi (3 socket(s))')

    await Promise.all([close(chat1, 1000), close(chat2, 1000), close(alice, 1000)])
  })

  it('Should not accept a request without the Upgrade header', async () => {
    const res = await fetch(`http://${worker.address}:${worker.port}/do/users/alice`)
    expect(res.status).toBe(404)

    const alice = await open('/do/users/alice')
    const message = nextMessage(alice)
    alice.send('Hi')
    expect(await message).toBe('user:alice: Hi (1 socket(s))')

    await close(alice, 1000)
  })

  it('Should close the connection with the code that the client sent', async () => {
    expect(await close(await open('/do/users/alice'), 1000, 'done')).toEqual([1000, 'done'])
    expect(await close(await open('/do/users/alice'))).toEqual([1005, ''])
  })
})
