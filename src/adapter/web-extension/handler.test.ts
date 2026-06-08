import { Hono } from '../../hono'
import { handle } from './handler'
import type { WebRequestDetails } from './types'

const createDetails = (overrides: Partial<WebRequestDetails> = {}): WebRequestDetails => ({
  url: 'http://localhost/',
  method: 'GET',
  type: 'main_frame',
  requestId: '1',
  tabId: 0,
  timeStamp: Date.now(),
  frameId: 0,
  parentFrameId: -1,
  ...overrides,
})

const parseDataUrl = (url: string): { contentType: string; body: string } => {
  const match = url.match(/^data:(.+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid data URL')
  }
  return {
    contentType: match[1],
    body: atob(match[2]),
  }
}

describe('handle', () => {
  it('should return a data URL redirect for a matched route', async () => {
    const app = new Hono()
    app.get('/', (c) => c.text('Hello from Hono'))

    const handler = handle(app)
    const result = await handler(createDetails())

    expect(result).toBeDefined()
    expect(result?.redirectUrl).toBeDefined()

    const { contentType, body } = parseDataUrl(result!.redirectUrl!)
    expect(contentType).toBe('text/plain;charset=UTF-8')
    expect(body).toBe('Hello from Hono')
  })

  it('should return undefined for unmatched routes (404)', async () => {
    const app = new Hono()
    app.get('/matched', (c) => c.text('OK'))

    const handler = handle(app)
    const result = await handler(createDetails({ url: 'http://localhost/unmatched' }))

    expect(result).toBeUndefined()
  })

  it('should handle JSON responses', async () => {
    const app = new Hono()
    app.get('/api', (c) => c.json({ message: 'hello' }))

    const handler = handle(app)
    const result = await handler(createDetails({ url: 'http://localhost/api' }))

    expect(result).toBeDefined()
    const { contentType, body } = parseDataUrl(result!.redirectUrl!)
    expect(contentType).toBe('application/json')
    expect(JSON.parse(body)).toEqual({ message: 'hello' })
  })

  it('should handle POST requests with form data body', async () => {
    const app = new Hono()
    app.post('/submit', async (c) => {
      const body = await c.req.parseBody()
      return c.json({ received: body })
    })

    const handler = handle(app)
    const result = await handler(
      createDetails({
        url: 'http://localhost/submit',
        method: 'POST',
        requestBody: {
          formData: {
            name: ['John'],
            age: ['30'],
          },
        },
      })
    )

    expect(result).toBeDefined()
    const { body } = parseDataUrl(result!.redirectUrl!)
    expect(JSON.parse(body)).toEqual({ received: { name: 'John', age: '30' } })
  })

  it('should handle POST requests with raw body', async () => {
    const app = new Hono()
    app.post('/raw', async (c) => {
      const text = await c.req.text()
      return c.text(`Received: ${text}`)
    })

    const encoder = new TextEncoder()
    const rawBody = encoder.encode('raw request body').buffer

    const handler = handle(app)
    const result = await handler(
      createDetails({
        url: 'http://localhost/raw',
        method: 'POST',
        requestBody: {
          raw: [{ bytes: rawBody }],
        },
      })
    )

    expect(result).toBeDefined()
    const { body } = parseDataUrl(result!.redirectUrl!)
    expect(body).toBe('Received: raw request body')
  })

  it('should handle routes with path parameters', async () => {
    const app = new Hono()
    app.get('/users/:id', (c) => {
      return c.json({ userId: c.req.param('id') })
    })

    const handler = handle(app)
    const result = await handler(createDetails({ url: 'http://localhost/users/123' }))

    expect(result).toBeDefined()
    const { body } = parseDataUrl(result!.redirectUrl!)
    expect(JSON.parse(body)).toEqual({ userId: '123' })
  })
})
