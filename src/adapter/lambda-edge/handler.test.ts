import { describe } from 'vitest'
import { setCookie } from '../../helper/cookie'
import { Hono } from '../../hono'
import { encodeBase64 } from '../../utils/encode'
import type { Callback, CloudFrontEdgeEvent } from './handler'
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

  it('Should expose async handler arity compatible with NODEJS_24_X', () => {
    const app = new Hono()
    const handler = handle(app)

    expect(handler.length).toBeLessThanOrEqual(2)
  })

  it('Should preserve positional callback compatibility', async () => {
    type Env = { Bindings: { callback: Callback } }
    const app = new Hono<Env>()
    const callback = vi.fn()

    app.get('/test-path', (c) => {
      c.env.callback?.(null, {
        status: '200',
        headers: {
          'x-test': [{ key: 'x-test', value: 'ok' }],
        },
      })
      return c.text('ok')
    })

    const handler = handle(app)
    await handler(cloudFrontEdgeEvent, undefined, callback)

    expect(callback).toHaveBeenCalledWith(null, {
      status: '200',
      headers: {
        'x-test': [{ key: 'x-test', value: 'ok' }],
      },
    })
  })

  it('Should preserve multi-value request headers from CloudFront', async () => {
    // CloudFront delivers headers as { name: [{ key, value }, ...] }, allowing
    // multiple values per header name. The previous implementation used
    // headers.set() inside the inner loop, so only the last value reached
    // the Hono Request — silently dropping repeated Accept, Cookie, etc.
    const app = new Hono()
    app.get('/test-path', (c) => {
      return c.json({
        accept: c.req.raw.headers.get('accept'),
        // Headers.get() collapses repeated values with ", " per the WHATWG spec,
        // so a passthrough of two Accept values appears here as "a/b, c/d".
      })
    })
    const handler = handle(app)

    const event: CloudFrontEdgeEvent = {
      Records: [
        {
          cf: {
            ...cloudFrontEdgeEvent.Records[0].cf,
            request: {
              ...cloudFrontEdgeEvent.Records[0].cf.request,
              headers: {
                host: [{ key: 'Host', value: 'hono.dev' }],
                accept: [
                  { key: 'Accept', value: 'text/html' },
                  { key: 'Accept', value: 'application/json' },
                ],
              },
            },
          },
        },
      ],
    }

    const res = await handler(event)
    expect(res.body).toBe(JSON.stringify({ accept: 'text/html, application/json' }))
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
