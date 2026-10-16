import { unstable_dev } from 'wrangler'
import type { Unstable_DevWorker } from 'wrangler'

describe('workerd', () => {
  let worker: Unstable_DevWorker

  beforeAll(async () => {
    worker = await unstable_dev('./runtime-tests/workerd/index.ts', {
      vars: {
        NAME: 'Hono',
      },
      compatibilityDate: '2026-07-01',
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

  it('Should return 200 response with the true message', async () => {
    const res = await worker.fetch('/color')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('True')
  })
})

describe('workerd with NO_COLOR', () => {
  let worker: Unstable_DevWorker

  beforeAll(async () => {
    worker = await unstable_dev('./runtime-tests/workerd/index.ts', {
      vars: {
        NO_COLOR: true,
      },
      compatibilityDate: '2026-07-01',
      experimental: { disableExperimentalWarning: true },
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  it('Should return 200 response with the false message', async () => {
    const res = await worker.fetch('/color')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('False')
  })
})
