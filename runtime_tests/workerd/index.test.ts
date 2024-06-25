import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker } from 'wrangler'
import { WebSocket } from 'ws'

describe('workerd', () => {
  let worker: UnstableDevWorker

  beforeAll(async () => {
    worker = await unstable_dev('./runtime_tests/workerd/index.ts', {
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
    const worker = await unstable_dev('./runtime_tests/workerd/index.ts', {
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
        resolve(undefined)
      })
      ws.addEventListener('close', async () => {
        closeHandler()
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

describe('workerd with Stream', () => {
  it('`onAbort` should be called when the stream is aborted', async () => {
    const worker = await unstable_dev('./runtime_tests/workerd/index.ts', {
      experimental: { disableExperimentalWarning: true },
    })

    const checkAbortRes = await worker.fetch('/check-abort')
    expect(checkAbortRes.status).toBe(200)
    expect(await checkAbortRes.json()).toEqual({ abortCount: 0 })

    const res = await worker.fetch('/stream')
    const reader = res.body?.getReader()
    reader?.cancel()

    const checkAbortRes2 = await worker.fetch('/check-abort')
    expect(checkAbortRes2.status).toBe(200)
    expect(await checkAbortRes2.json()).toEqual({ abortCount: 1 })
  })
})
