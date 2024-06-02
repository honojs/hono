import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker } from 'wrangler'

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
