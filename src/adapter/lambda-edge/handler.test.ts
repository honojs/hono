import { describe } from 'vitest'
import { setCookie } from '../../helper/cookie'
import { Hono } from '../../hono'
import { encodeBase64 } from '../../utils/encode'
import type { CloudFrontEdgeEvent } from './handler'
import { createBody, handle, isContentTypeBinary } from './handler'

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
})

describe('handle', () => {
  const cloudFrontEdgeEvent: CloudFrontEdgeEvent = {
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

  it('Should support alternate domain names', async () => {
    const app = new Hono()
    app.get('/test-path', (c) => {
      return c.text(c.req.url)
    })
    const handler = handle(app)

    const res = await handler(cloudFrontEdgeEvent)

    expect(res.body).toBe('https://hono.dev/test-path')
  })

  it('Should base64 encode compressed response body', async () => {
    const app = new Hono()
    app.get('/test-path', (c) => {
      return new Response('compressed-data', {
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          'content-encoding': 'gzip',
        },
      })
    })
    const handler = handle(app)

    const res = await handler(cloudFrontEdgeEvent)

    expect(res.bodyEncoding).toBe('base64')
  })

  it('Should not base64 encode uncompressed text response', async () => {
    const app = new Hono()
    app.get('/test-path', (c) => {
      return c.text('hello')
    })
    const handler = handle(app)

    const res = await handler(cloudFrontEdgeEvent)

    expect(res.bodyEncoding).toBeUndefined()
    expect(res.body).toBe('hello')
  })

  it('Should support multiple cookies', async () => {
    const app = new Hono()
    app.get('/test-path', (c) => {
      setCookie(c, 'cookie1', 'value1')
      setCookie(c, 'cookie2', 'value2')
      return c.text('')
    })
    const handler = handle(app)

    const res = await handler(cloudFrontEdgeEvent)

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
})
