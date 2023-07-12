import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker } from 'wrangler'

describe('Wrangler', () => {
  let worker: UnstableDevWorker

  beforeAll(async () => {
    worker = await unstable_dev('./runtime_tests/wrangler/index.ts', {
      vars: {
        NAME: 'Cloudflare',
      },
      experimental: { disableExperimentalWarning: true },
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  it('Should return Hello World', async () => {
    const res = await worker.fetch('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello Wrangler!')
  })

  it('Should return the environment variable', async () => {
    const res = await worker.fetch('/env')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Cloudflare')
  })
})
