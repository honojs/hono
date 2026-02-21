import { describe } from 'vitest'
import { setCookie } from '../../helper/cookie'
import { Hono } from '../../hono'
import { encodeBase64 } from '../../utils/encode'
import type { Callback, CloudFrontConfig, CloudFrontEdgeEvent, CloudFrontRequest } from './handler'
import { createBody, handle, isContentTypeBinary } from './handler'

// Base event to reduce duplication across tests
const baseCloudFrontEdgeEvent: CloudFrontEdgeEvent = {
  Records: [
    {
      cf: {
        config: {
          distributionDomainName: 'd111111abcdef8.cloudfront.net',
          distributionId: 'EDFDVBD6EXAMPLE',
          eventType: 'viewer-request',
          requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
        },
        request: {
          clientIp: '1.2.3.4',
          headers: {
            host: [
              {
                key: 'Host',
                value: 'hono.dev',
              },
            ],
            accept: [
              {
                key: 'accept',
                value: '*/*',
              },
            ],
          },
          method: 'GET',
          querystring: '',
          uri: '/test-path',
        },
      },
    },
  ],
}

describe('isContentTypeBinary', () => {
  it('Should determine whether it is binary', () => {
    expect(isContentTypeBinary('image/png')).toBe(true)
    expect(isContentTypeBinary('font/woff2')).toBe(true)
    expect(isContentTypeBinary('image/svg+xml')).toBe(false)
    expect(isContentTypeBinary('image/svg+xml; charset=UTF-8')).toBe(false)
    expect(isContentTypeBinary('text/plain')).toBe(false)
    expect(isContentTypeBinary('text/plain; charset=UTF-8')).toBe(false)
    expect(isContentTypeBinary('text/css')).toBe(false)
    expect(isContentTypeBinary('text/javascript')).toBe(false)
    expect(isContentTypeBinary('application/json')).toBe(false)
    expect(isContentTypeBinary('application/ld+json')).toBe(false)
    expect(isContentTypeBinary('application/json')).toBe(false)
  })

  it.each([
    ['text/csv', false],
    ['text/html; charset=UTF-8', false],
    ['application/xml', false],
    ['application/atom+xml', false],
    // Note: lambda-edge regex treats application/.*xml as non-binary (unlike aws-lambda)
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', false],
    ['application/octet-stream', true],
    ['application/pdf', true],
    ['audio/mpeg', true],
    ['video/mp4', true],
  ])('Should determine whether %s is binary', (mimeType: string, expected: boolean) => {
    expect(isContentTypeBinary(mimeType)).toBe(expected)
  })
})

describe('createBody', () => {
  it('Should the request be a GET or HEAD, the Request must not include a Body', () => {
    const encoder = new TextEncoder()
    const data = encoder.encode('test')
    const body = {
      action: 'read-only',
      data: encodeBase64(data.buffer),
      encoding: 'base64',
      inputTruncated: false,
    }

    expect(createBody('GET', body)).toEqual(undefined)
    expect(createBody('GET', body)).not.toEqual(data)
    expect(createBody('HEAD', body)).toEqual(undefined)
    expect(createBody('HEAD', body)).not.toEqual(data)
    expect(createBody('POST', body)).toEqual(data)
    expect(createBody('POST', body)).not.toEqual(undefined)
  })

  it('Should return body for PUT, DELETE, and PATCH methods', () => {
    const encoder = new TextEncoder()
    const data = encoder.encode('test')
    const body = {
      action: 'read-only',
      data: encodeBase64(data.buffer),
      encoding: 'base64',
      inputTruncated: false,
    }

    expect(createBody('PUT', body)).toEqual(data)
    expect(createBody('DELETE', body)).toEqual(data)
    expect(createBody('PATCH', body)).toEqual(data)
  })

  it('Should return text data when encoding is not base64', () => {
    const body = {
      action: 'read-only',
      data: 'plain text body',
      encoding: 'text',
      inputTruncated: false,
    }

    expect(createBody('POST', body)).toBe('plain text body')
  })

  it('Should return undefined when requestBody is undefined', () => {
    expect(createBody('POST', undefined)).toBeUndefined()
  })

  it('Should return undefined when requestBody.data is empty', () => {
    const body = {
      action: 'read-only',
      data: '',
      encoding: 'base64',
      inputTruncated: false,
    }

    expect(createBody('POST', body)).toBeUndefined()
  })
})

describe('handle', () => {
  it('Should support alternate domain names', async () => {
    const app = new Hono()
    app.get('/test-path', (c) => {
      return c.text(c.req.url)
    })
    const handler = handle(app)

    const res = await handler(baseCloudFrontEdgeEvent)

    expect(res.body).toBe('https://hono.dev/test-path')
  })

  it('Should support multiple cookies', async () => {
    const app = new Hono()
    app.get('/test-path', (c) => {
      setCookie(c, 'cookie1', 'value1')
      setCookie(c, 'cookie2', 'value2')
      return c.text('')
    })
    const handler = handle(app)

    const res = await handler(baseCloudFrontEdgeEvent)

    expect(res.headers).toEqual({
      'content-type': [
        {
          key: 'content-type',
          value: 'text/plain; charset=UTF-8',
        },
      ],
      'set-cookie': [
        {
          key: 'set-cookie',
          value: 'cookie1=value1; Path=/',
        },
        {
          key: 'set-cookie',
          value: 'cookie2=value2; Path=/',
        },
      ],
    })
  })

  describe('createRequest (tested indirectly via handle)', () => {
    it('Should fall back to distributionDomainName when host header is absent', async () => {
      const app = new Hono()
      app.get('/test-path', (c) => {
        return c.text(c.req.url)
      })

      const event: CloudFrontEdgeEvent = {
        Records: [
          {
            cf: {
              config: {
                ...baseCloudFrontEdgeEvent.Records[0].cf.config,
              },
              request: {
                clientIp: '1.2.3.4',
                headers: {
                  // No host header
                  accept: [{ key: 'accept', value: '*/*' }],
                },
                method: 'GET',
                querystring: '',
                uri: '/test-path',
              },
            },
          },
        ],
      }

      const handler = handle(app)
      const res = await handler(event)

      expect(res.body).toBe('https://d111111abcdef8.cloudfront.net/test-path')
    })

    it('Should append querystring to URL when present', async () => {
      const app = new Hono()
      app.get('/search', (c) => {
        return c.text(c.req.url)
      })

      const event: CloudFrontEdgeEvent = {
        Records: [
          {
            cf: {
              config: {
                ...baseCloudFrontEdgeEvent.Records[0].cf.config,
              },
              request: {
                clientIp: '1.2.3.4',
                headers: {
                  host: [{ key: 'Host', value: 'example.com' }],
                },
                method: 'GET',
                querystring: 'q=hono&page=1',
                uri: '/search',
              },
            },
          },
        ],
      }

      const handler = handle(app)
      const res = await handler(event)

      expect(res.body).toBe('https://example.com/search?q=hono&page=1')
    })

    it('Should not append "?" when querystring is empty', async () => {
      const app = new Hono()
      app.get('/test-path', (c) => {
        return c.text(c.req.url)
      })

      const handler = handle(app)
      const res = await handler(baseCloudFrontEdgeEvent)

      expect(res.body).toBe('https://hono.dev/test-path')
      expect(res.body).not.toContain('?')
    })

    it('Should convert CloudFront headers to Request headers', async () => {
      const app = new Hono()
      app.get('/test-path', (c) => {
        return c.json({
          contentType: c.req.header('content-type'),
          xCustom: c.req.header('x-custom'),
        })
      })

      const event: CloudFrontEdgeEvent = {
        Records: [
          {
            cf: {
              config: {
                ...baseCloudFrontEdgeEvent.Records[0].cf.config,
              },
              request: {
                clientIp: '1.2.3.4',
                headers: {
                  host: [{ key: 'Host', value: 'example.com' }],
                  'content-type': [{ key: 'Content-Type', value: 'application/json' }],
                  'x-custom': [{ key: 'X-Custom', value: 'custom-value' }],
                },
                method: 'GET',
                querystring: '',
                uri: '/test-path',
              },
            },
          },
        ],
      }

      const handler = handle(app)
      const res = await handler(event)
      const body = JSON.parse(res.body!)

      expect(body.contentType).toBe('application/json')
      expect(body.xCustom).toBe('custom-value')
    })

    it('Should create a Request with no body for GET requests', async () => {
      const app = new Hono()
      app.get('/test-path', async (c) => {
        const body = await c.req.text()
        return c.text(body || 'empty')
      })

      const handler = handle(app)
      const res = await handler(baseCloudFrontEdgeEvent)

      expect(res.body).toBe('empty')
    })

    it('Should decode base64 body for POST requests', async () => {
      const app = new Hono()
      app.post('/upload', async (c) => {
        const body = await c.req.text()
        return c.text(body)
      })

      const event: CloudFrontEdgeEvent = {
        Records: [
          {
            cf: {
              config: {
                ...baseCloudFrontEdgeEvent.Records[0].cf.config,
              },
              request: {
                clientIp: '1.2.3.4',
                headers: {
                  host: [{ key: 'Host', value: 'example.com' }],
                  'content-type': [
                    { key: 'Content-Type', value: 'application/x-www-form-urlencoded' },
                  ],
                },
                method: 'POST',
                querystring: '',
                uri: '/upload',
                body: {
                  inputTruncated: false,
                  action: 'read-only',
                  encoding: 'base64',
                  data: btoa('message=Hello'),
                },
              },
            },
          },
        ],
      }

      const handler = handle(app)
      const res = await handler(event)

      expect(res.body).toBe('message=Hello')
    })
  })

  describe('createResult (tested indirectly via handle)', () => {
    it('Should return status as string', async () => {
      const app = new Hono()
      app.get('/test-path', (c) => {
        return c.text('OK', 200)
      })

      const handler = handle(app)
      const res = await handler(baseCloudFrontEdgeEvent)

      expect(res.status).toBe('200')
      expect(typeof res.status).toBe('string')
    })

    it('Should return non-200 status codes as string', async () => {
      const app = new Hono()
      app.get('/test-path', (c) => {
        return c.text('Created', 201)
      })

      const handler = handle(app)
      const res = await handler(baseCloudFrontEdgeEvent)

      expect(res.status).toBe('201')
    })

    it('Should not set bodyEncoding for non-binary content', async () => {
      const app = new Hono()
      app.get('/test-path', (c) => {
        return c.text('hello')
      })

      const handler = handle(app)
      const res = await handler(baseCloudFrontEdgeEvent)

      expect(res.body).toBe('hello')
      expect(res.bodyEncoding).toBeUndefined()
    })

    it('Should set bodyEncoding to "base64" for binary content', async () => {
      const app = new Hono()
      app.get('/test-path', (c) => {
        return c.body('Fake Image', 200, {
          'Content-Type': 'image/png',
        })
      })

      const handler = handle(app)
      const res = await handler(baseCloudFrontEdgeEvent)

      expect(res.bodyEncoding).toBe('base64')
      expect(res.body).toBe(btoa('Fake Image'))
    })

    it('Should convert response headers to CloudFront header format', async () => {
      const app = new Hono()
      app.get('/test-path', (c) => {
        return c.text('hello', 200, {
          'X-Custom-Header': 'custom-value',
          'Cache-Control': 'max-age=3600',
        })
      })

      const handler = handle(app)
      const res = await handler(baseCloudFrontEdgeEvent)

      expect(res.headers!['x-custom-header']).toEqual([
        { key: 'x-custom-header', value: 'custom-value' },
      ])
      expect(res.headers!['cache-control']).toEqual([
        { key: 'cache-control', value: 'max-age=3600' },
      ])
    })

    it('Should return 404 status for unmatched routes', async () => {
      const app = new Hono()
      app.get('/existing', (c) => c.text('found'))

      const handler = handle(app)
      const res = await handler(baseCloudFrontEdgeEvent) // requests /test-path which doesn't exist

      expect(res.status).toBe('404')
    })
  })

  describe('env bindings', () => {
    type Bindings = {
      callback: Callback
      config: CloudFrontConfig
      request: CloudFrontRequest
    }

    it('Should pass event, config, and request as env bindings', async () => {
      const app = new Hono<{ Bindings: Bindings }>()
      app.get('/test-path', (c) => {
        return c.json({
          distributionId: c.env.config.distributionId,
          clientIp: c.env.request.clientIp,
          eventType: c.env.config.eventType,
        })
      })

      const handler = handle(app)
      const res = await handler(baseCloudFrontEdgeEvent)
      const body = JSON.parse(res.body!)

      expect(body.distributionId).toBe('EDFDVBD6EXAMPLE')
      expect(body.clientIp).toBe('1.2.3.4')
      expect(body.eventType).toBe('viewer-request')
    })

    it('Should invoke callback when provided', async () => {
      const app = new Hono<{ Bindings: Bindings }>()
      app.get('/test-path', async (c, next) => {
        await next()
        c.env.callback(null, c.env.request)
      })
      app.get('/test-path', (c) => c.text('OK'))

      const handler = handle(app)

      let callbackCalled = false
      let callbackResult: CloudFrontRequest | undefined

      await handler(baseCloudFrontEdgeEvent, {}, (err, result) => {
        callbackCalled = true
        if (result && 'clientIp' in result) {
          callbackResult = result as CloudFrontRequest
        }
      })

      expect(callbackCalled).toBe(true)
      expect(callbackResult?.clientIp).toBe('1.2.3.4')
    })

    it('Should not throw when callback is not provided', async () => {
      const app = new Hono<{ Bindings: Bindings }>()
      app.get('/test-path', async (c, next) => {
        await next()
        // Calling callback without providing one in handle() should not throw
        c.env.callback(null, c.env.request)
      })
      app.get('/test-path', (c) => c.text('OK'))

      const handler = handle(app)

      // No callback argument — should not throw
      const res = await handler(baseCloudFrontEdgeEvent)
      expect(res.status).toBe('200')
    })

    it('Should pass context as env binding', async () => {
      const app = new Hono<{ Bindings: { context: Record<string, unknown> } }>()
      app.get('/test-path', (c) => {
        return c.json({ hasContext: c.env.context !== undefined })
      })

      const handler = handle(app)
      const mockContext = { functionName: 'myFunction' }
      const res = await handler(baseCloudFrontEdgeEvent, mockContext)
      const body = JSON.parse(res.body!)

      expect(body.hasContext).toBe(true)
    })
  })
})
