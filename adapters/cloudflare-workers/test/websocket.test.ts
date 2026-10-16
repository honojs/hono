import { unstable_dev } from 'wrangler'
import { WebSocket } from 'ws'

describe('upgradeWebSocket on workerd', () => {
  // worker.fetch does not support WebSocket:
  // https://github.com/cloudflare/workers-sdk/issues/4573#issuecomment-1850420973
  it('Should echo a message over the WebSocket connection', async () => {
    const worker = await unstable_dev('./test/worker.ts', {
      compatibilityDate: '2026-07-01',
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
