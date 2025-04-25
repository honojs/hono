import { unstable_dev } from 'wrangler'
import type { Unstable_DevWorker } from 'wrangler'
import { WebSocket } from 'ws'

describe('workerd', () => {
  let worker: Unstable_DevWorker

  beforeAll(async () => {
    worker = await unstable_dev('./runtime-tests/workerd/index.ts', {
      vars: {
        NAME: 'Hono',
      },
      experimental: { disableExperimentalWarning: true },
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  it('Should return 200 response with the runtime key', async () => {
    const res = await worker.fetch('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello from workerd')
  })

  it('Should return 200 response with the environment variable', async () => {
    const res = await worker.fetch('/env')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hono')
  })
})

describe('workerd with WebSocket', () => {
  // worker.fetch does not support WebSocket:
  // https://github.com/cloudflare/workers-sdk/issues/4573#issuecomment-1850420973
  it('Should handle the WebSocket connection correctly', async () => {
    const worker = await unstable_dev('./runtime-tests/workerd/index.ts', {
      experimental: { disableExperimentalWarning: true },
    })
    const ws = new WebSocket(`ws://${worker.address}:${worker.port}/ws`)

    const openHandler = vi.fn()
    const messageHandler = vi.fn()
    const closeHandler = vi.fn()

    const waitForOpen = new Promise((resolve) => {
      ws.addEventListener('open', () => {
        openHandler()
        ws.send('Hello')
      })
      ws.addEventListener('close', async () => {
        closeHandler()
        resolve(undefined)
      })
      ws.addEventListener('message', async (event) => {
        messageHandler(event.data)
        ws.close()
      })
    })

    await waitForOpen
    await worker.stop()

    expect(openHandler).toHaveBeenCalled()
    expect(messageHandler).toHaveBeenCalledWith('Hello')
    expect(closeHandler).toHaveBeenCalled()
  })
})
