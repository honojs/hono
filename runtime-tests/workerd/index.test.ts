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

  it('Should stream JSX Suspense content', async () => {
    const res = await worker.fetch('/jsx-stream')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    if (!res.body) {
      throw new Error('Response body is null')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const firstChunk = await reader.read()
    expect(firstChunk.done).toBe(false)
    const initialHtml = decoder.decode(firstChunk.value)
    expect(initialHtml).toContain('<p>Loading...</p>')

    let html = initialHtml
    for (;;) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      html += decoder.decode(value)
    }

    expect(html).toContain('<p>Loading...</p>')
    expect(html).toContain('<template data-hono-target="H:0"><p>Loaded</p></template>')
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
