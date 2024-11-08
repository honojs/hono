import { handle } from '../../src/adapter/alibaba-cloud-fc3/handler'
import type {
  AlibabaCloudFC3Context,
  AlibabaCloudFC3Event,
} from '../../src/adapter/alibaba-cloud-fc3/types'
import { Hono } from '../../src/hono'
import { basicAuth } from '../../src/middleware/basic-auth'

type Bindings = {
  event: AlibabaCloudFC3Event
  context: AlibabaCloudFC3Context
}

describe('Alibaba Cloud FC3 Adapter for Hono', () => {
  const app = new Hono<{ Bindings: Bindings }>()

  app.get('/', (c) => {
    return c.text('Hello FC3!')
  })

  app.get('/binary', (c) => {
    return c.body('Fake Image', 200, {
      'Content-Type': 'image/png',
    })
  })

  app.post('/post', async (c) => {
    const body = (await c.req.parseBody()) as { message: string }
    return c.text(body.message)
  })

  app.post('/post/binary', async (c) => {
    const body = await c.req.blob()
    return c.text(`${body.size} bytes`)
  })

  const username = 'hono-user-a'
  const password = 'hono-password-a'
  app.use('/auth/*', basicAuth({ username, password }))
  app.get('/auth/abc', (c) => c.text('Good Night FC3!'))

  const handler = handle(app)

  it('Should handle a GET request and return a 200 response', async () => {
    const event = Buffer.from(
      JSON.stringify({
        version: 'v1',
        rawPath: '/',
        headers: {
          host: 'example.com',
          'user-agent': 'curl/7.81.0',
          accept: '*/*',
        },
        queryParameters: {},
        body: '',
        isBase64Encoded: false,
        requestContext: {
          accountId: '1234567890',
          domainName: 'example.com',
          domainPrefix: 'test',
          http: {
            method: 'GET',
            path: '/',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'curl/7.81.0',
          },
          requestId: 'test-request-id',
          time: '2024-01-01T00:00:00Z',
          timeEpoch: '1704067200000',
        },
      })
    )

    const response = await handler(event, {} as AlibabaCloudFC3Context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Hello FC3!')
    expect(response.headers?.['content-type']).toMatch(/^text\/plain/)
  })

  it('Should handle a GET request and return a 200 response with binary', async () => {
    const event = Buffer.from(
      JSON.stringify({
        version: 'v1',
        rawPath: '/binary',
        headers: {
          host: 'example.com',
        },
        queryParameters: {},
        body: '',
        isBase64Encoded: false,
        requestContext: {
          accountId: '1234567890',
          domainName: 'example.com',
          domainPrefix: 'test',
          http: {
            method: 'GET',
            path: '/binary',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'curl/7.81.0',
          },
          requestId: 'test-request-id',
          time: '2024-01-01T00:00:00Z',
          timeEpoch: '1704067200000',
        },
      })
    )

    const response = await handler(event, {} as AlibabaCloudFC3Context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('RmFrZSBJbWFnZQ==') // base64 encoded "Fake Image"
    expect(response.headers?.['content-type']).toMatch(/^image\/png/)
    expect(response.isBase64Encoded).toBe(true)
  })

  it('Should handle a POST request and return a 200 response', async () => {
    const message = 'Good Morning FC3!'
    const searchParam = new URLSearchParams()
    searchParam.append('message', message)

    const event = Buffer.from(
      JSON.stringify({
        version: 'v1',
        rawPath: '/post',
        headers: {
          host: 'example.com',
          'content-type': 'application/x-www-form-urlencoded',
        },
        queryParameters: {},
        body: Buffer.from(searchParam.toString()).toString('base64'),
        isBase64Encoded: true,
        requestContext: {
          accountId: '1234567890',
          domainName: 'example.com',
          domainPrefix: 'test',
          http: {
            method: 'POST',
            path: '/post',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'curl/7.81.0',
          },
          requestId: 'test-request-id',
          time: '2024-01-01T00:00:00Z',
          timeEpoch: '1704067200000',
        },
      })
    )

    const response = await handler(event, {} as AlibabaCloudFC3Context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(message)
  })

  it('Should handle a POST request with binary and return a 200 response', async () => {
    const array = new Uint8Array([0xc0, 0xff, 0xee])
    const buffer = Buffer.from(array)

    const event = Buffer.from(
      JSON.stringify({
        version: 'v1',
        rawPath: '/post/binary',
        headers: {
          host: 'example.com',
          'content-type': 'application/octet-stream',
        },
        queryParameters: {},
        body: buffer.toString('base64'),
        isBase64Encoded: true,
        requestContext: {
          accountId: '1234567890',
          domainName: 'example.com',
          domainPrefix: 'test',
          http: {
            method: 'POST',
            path: '/post/binary',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'curl/7.81.0',
          },
          requestId: 'test-request-id',
          time: '2024-01-01T00:00:00Z',
          timeEpoch: '1704067200000',
        },
      })
    )

    const response = await handler(event, {} as AlibabaCloudFC3Context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('3 bytes')
  })

  it('Should handle a request and return a 401 response with Basic auth', async () => {
    const event = Buffer.from(
      JSON.stringify({
        version: 'v1',
        rawPath: '/auth/abc',
        headers: {
          host: 'example.com',
          'content-type': 'text/plain',
        },
        queryParameters: {},
        body: '',
        isBase64Encoded: false,
        requestContext: {
          accountId: '1234567890',
          domainName: 'example.com',
          domainPrefix: 'test',
          http: {
            method: 'GET',
            path: '/auth/abc',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'curl/7.81.0',
          },
          requestId: 'test-request-id',
          time: '2024-01-01T00:00:00Z',
          timeEpoch: '1704067200000',
        },
      })
    )

    const response = await handler(event, {} as AlibabaCloudFC3Context)

    expect(response.statusCode).toBe(401)
  })

  it('Should handle a GET request and return a 404 response', async () => {
    const event = Buffer.from(
      JSON.stringify({
        version: 'v1',
        rawPath: '/nothing',
        headers: {
          host: 'example.com',
        },
        queryParameters: {},
        body: '',
        isBase64Encoded: false,
        requestContext: {
          accountId: '1234567890',
          domainName: 'example.com',
          domainPrefix: 'test',
          http: {
            method: 'GET',
            path: '/nothing',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'curl/7.81.0',
          },
          requestId: 'test-request-id',
          time: '2024-01-01T00:00:00Z',
          timeEpoch: '1704067200000',
        },
      })
    )

    const response = await handler(event, {} as AlibabaCloudFC3Context)

    expect(response.statusCode).toBe(404)
  })
})
