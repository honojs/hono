/* eslint-disable quotes */
import type {
  Callback,
  CloudFrontConfig,
  CloudFrontRequest,
  CloudFrontResponse,
} from '../../src/adapter/lambda-edge/handler'
import { handle } from '../../src/adapter/lambda-edge/handler'
import { Hono } from '../../src/hono'
import { basicAuth } from '../../src/middleware/basic-auth'

type Bindings = {
  callback: Callback
  config: CloudFrontConfig
  request: CloudFrontRequest
  response: CloudFrontResponse
}

describe('Lambda@Edge Adapter for Hono', () => {
  const app = new Hono<{ Bindings: Bindings }>()

  app.get('/', (c) => {
    return c.text('Hello Lambda!')
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

  app.get('/callback/request', async (c, next) => {
    await next()
    c.env.callback(null, c.env.request)
  })

  app.get('/config/eventCheck', async (c, next) => {
    await next()
    if (c.env.config.eventType in ['viewer-request', 'origin-request']) {
      c.env.callback(null, c.env.request)
    } else {
      c.env.callback(null, c.env.response)
    }
  })

  app.get('/callback/response', async (c, next) => {
    await next()
    c.env.callback(null, c.env.response)
  })

  app.post('/post/binary', async (c) => {
    const body = await c.req.blob()
    return c.text(`${body.size} bytes`)
  })

  const username = 'hono-user-a'
  const password = 'hono-password-a'
  app.use('/auth/*', basicAuth({ username, password }))
  app.get('/auth/abc', (c) => c.text('Good Night Lambda!'))

  app.get('/header/add', async (c, next) => {
    c.env.response.headers['Strict-Transport-Security'.toLowerCase()] = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubdomains; preload',
      },
    ]
    c.env.response.headers['X-Custom'.toLowerCase()] = [
      {
        key: 'X-Custom',
        value: 'Foo',
      },
    ]
    await next()
    c.env.callback(null, c.env.response)
  })

  const handler = handle(app)

  it('Should handle a GET request and return a 200 response (Lambda@Edge viewer request)', async () => {
    const event = {
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
              clientIp: '203.0.113.178',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'd111111abcdef8.cloudfront.net',
                  },
                ],
                'user-agent': [
                  {
                    key: 'User-Agent',
                    value: 'curl/7.66.0',
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
              uri: '/',
            },
          },
        },
      ],
    }
    const response = await handler(event)
    expect(response.status).toBe('200')
    expect(response.body).toBe('Hello Lambda!')
    if (response.headers && response.headers['content-type']) {
      expect(response.headers['content-type'][0].value).toMatch(/^text\/plain/)
    } else {
      throw new Error("'content-type' header is missing in the response")
    }
  })

  it('Should handle a GET request and return a 200 response (Lambda@Edge origin request)', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'd111111abcdef8.cloudfront.net',
              distributionId: 'EDFDVBD6EXAMPLE',
              eventType: 'origin-request',
              requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
            },
            request: {
              clientIp: '203.0.113.178',
              headers: {
                'x-forwarded-for': [
                  {
                    key: 'X-Forwarded-For',
                    value: '203.0.113.178',
                  },
                ],
                'user-agent': [
                  {
                    key: 'User-Agent',
                    value: 'Amazon CloudFront',
                  },
                ],
                via: [
                  {
                    key: 'Via',
                    value: '2.0 2afae0d44e2540f472c0635ab62c232b.cloudfront.net (CloudFront)',
                  },
                ],
                host: [
                  {
                    key: 'Host',
                    value: 'example.org',
                  },
                ],
                'cache-control': [
                  {
                    key: 'Cache-Control',
                    value: 'no-cache',
                  },
                ],
              },
              method: 'GET',
              origin: {
                custom: {
                  customHeaders: {},
                  domainName: 'example.org',
                  keepaliveTimeout: 5,
                  path: '',
                  port: 443,
                  protocol: 'https',
                  readTimeout: 30,
                  sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
                },
              },
              querystring: '',
              uri: '/',
            },
          },
        },
      ],
    }
    const response = await handler(event)
    expect(response.status).toBe('200')
    expect(response.body).toBe('Hello Lambda!')
    if (response.headers && response.headers['content-type']) {
      expect(response.headers['content-type'][0].value).toMatch(/^text\/plain/)
    } else {
      throw new Error("'content-type' header is missing in the response")
    }
  })

  it('Should handle a GET request and return a 200 response (Lambda@Edge viewer response)', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'd111111abcdef8.cloudfront.net',
              distributionId: 'EDFDVBD6EXAMPLE',
              eventType: 'viewer-response',
              requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
            },
            request: {
              clientIp: '203.0.113.178',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'd111111abcdef8.cloudfront.net',
                  },
                ],
                'user-agent': [
                  {
                    key: 'User-Agent',
                    value: 'curl/7.66.0',
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
              uri: '/',
            },
            response: {
              headers: {
                'access-control-allow-credentials': [
                  {
                    key: 'Access-Control-Allow-Credentials',
                    value: 'true',
                  },
                ],
                'access-control-allow-origin': [
                  {
                    key: 'Access-Control-Allow-Origin',
                    value: '*',
                  },
                ],
                date: [
                  {
                    key: 'Date',
                    value: 'Mon, 13 Jan 2020 20:14:56 GMT',
                  },
                ],
                'referrer-policy': [
                  {
                    key: 'Referrer-Policy',
                    value: 'no-referrer-when-downgrade',
                  },
                ],
                server: [
                  {
                    key: 'Server',
                    value: 'ExampleCustomOriginServer',
                  },
                ],
                'x-content-type-options': [
                  {
                    key: 'X-Content-Type-Options',
                    value: 'nosniff',
                  },
                ],
                'x-frame-options': [
                  {
                    key: 'X-Frame-Options',
                    value: 'DENY',
                  },
                ],
                'x-xss-protection': [
                  {
                    key: 'X-XSS-Protection',
                    value: '1; mode=block',
                  },
                ],
                age: [
                  {
                    key: 'Age',
                    value: '2402',
                  },
                ],
                'content-type': [
                  {
                    key: 'Content-Type',
                    value: 'text/html; charset=utf-8',
                  },
                ],
                'content-length': [
                  {
                    key: 'Content-Length',
                    value: '9593',
                  },
                ],
              },
              status: '200',
              statusDescription: 'OK',
            },
          },
        },
      ],
    }
    const response = await handler(event)
    expect(response.status).toBe('200')
    expect(response.body).toBe('Hello Lambda!')
    if (response.headers && response.headers['content-type']) {
      expect(response.headers['content-type'][0].value).toMatch(/^text\/plain/)
    } else {
      throw new Error("'content-type' header is missing in the response")
    }
  })

  it('Should handle a GET request and return a 200 response (Lambda@Edge origin response)', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'd111111abcdef8.cloudfront.net',
              distributionId: 'EDFDVBD6EXAMPLE',
              eventType: 'origin-response',
              requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
            },
            request: {
              clientIp: '203.0.113.178',
              headers: {
                'x-forwarded-for': [
                  {
                    key: 'X-Forwarded-For',
                    value: '203.0.113.178',
                  },
                ],
                'user-agent': [
                  {
                    key: 'User-Agent',
                    value: 'Amazon CloudFront',
                  },
                ],
                via: [
                  {
                    key: 'Via',
                    value: '2.0 8f22423015641505b8c857a37450d6c0.cloudfront.net (CloudFront)',
                  },
                ],
                host: [
                  {
                    key: 'Host',
                    value: 'example.org',
                  },
                ],
                'cache-control': [
                  {
                    key: 'Cache-Control',
                    value: 'no-cache',
                  },
                ],
              },
              method: 'GET',
              origin: {
                custom: {
                  customHeaders: {},
                  domainName: 'example.org',
                  keepaliveTimeout: 5,
                  path: '',
                  port: 443,
                  protocol: 'https',
                  readTimeout: 30,
                  sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
                },
              },
              querystring: '',
              uri: '/',
            },
            response: {
              headers: {
                'access-control-allow-credentials': [
                  {
                    key: 'Access-Control-Allow-Credentials',
                    value: 'true',
                  },
                ],
                'access-control-allow-origin': [
                  {
                    key: 'Access-Control-Allow-Origin',
                    value: '*',
                  },
                ],
                date: [
                  {
                    key: 'Date',
                    value: 'Mon, 13 Jan 2020 20:12:38 GMT',
                  },
                ],
                'referrer-policy': [
                  {
                    key: 'Referrer-Policy',
                    value: 'no-referrer-when-downgrade',
                  },
                ],
                server: [
                  {
                    key: 'Server',
                    value: 'ExampleCustomOriginServer',
                  },
                ],
                'x-content-type-options': [
                  {
                    key: 'X-Content-Type-Options',
                    value: 'nosniff',
                  },
                ],
                'x-frame-options': [
                  {
                    key: 'X-Frame-Options',
                    value: 'DENY',
                  },
                ],
                'x-xss-protection': [
                  {
                    key: 'X-XSS-Protection',
                    value: '1; mode=block',
                  },
                ],
                'content-type': [
                  {
                    key: 'Content-Type',
                    value: 'text/html; charset=utf-8',
                  },
                ],
                'content-length': [
                  {
                    key: 'Content-Length',
                    value: '9593',
                  },
                ],
              },
              status: '200',
              statusDescription: 'OK',
            },
          },
        },
      ],
    }
    const response = await handler(event)
    expect(response.status).toBe('200')
    expect(response.body).toBe('Hello Lambda!')
    if (response.headers && response.headers['content-type']) {
      expect(response.headers['content-type'][0].value).toMatch(/^text\/plain/)
    } else {
      throw new Error("'content-type' header is missing in the response")
    }
  })

  it('Should handle a GET request and return a 200 response with binary', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EXAMPLE123',
              eventType: 'viewer-request',
              requestId: 'exampleRequestId',
            },
            request: {
              clientIp: '123.123.123.123',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
              },
              method: 'GET',
              querystring: '',
              uri: '/binary',
            },
          },
        },
      ],
    }

    const response = await handler(event)

    expect(response.status).toBe('200')
    expect(response.body).toBe('RmFrZSBJbWFnZQ==') // base64 encoded fake image
    if (response.headers && response.headers['content-type']) {
      expect(response.headers['content-type'][0].value).toMatch(/^image\/png/)
    } else {
      throw new Error("'content-type' header is missing in the response")
    }
  })

  it('Should handle a GET request and return a 404 response', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EXAMPLE123',
              eventType: 'viewer-request',
              requestId: 'exampleRequestId',
            },
            request: {
              clientIp: '123.123.123.123',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
              },
              method: 'GET',
              querystring: '',
              uri: '/nothing',
            },
          },
        },
      ],
    }

    const response = await handler(event)

    expect(response.status).toBe('404')
  })

  it('Should handle a POST request and return a 200 response', async () => {
    const searchParam = new URLSearchParams()
    searchParam.append('message', 'Good Morning Lambda!')

    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EXAMPLE123',
              eventType: 'viewer-request',
              requestId: 'exampleRequestId',
            },
            request: {
              clientIp: '123.123.123.123',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
                'content-type': [
                  {
                    key: 'Content-Type',
                    value: 'application/x-www-form-urlencoded',
                  },
                ],
              },
              method: 'POST',
              querystring: '',
              uri: '/post',
              body: {
                inputTruncated: false,
                action: 'read-only',
                encoding: 'base64',
                data: Buffer.from(searchParam.toString()).toString('base64'),
              },
            },
          },
        },
      ],
    }

    const response = await handler(event)

    expect(response.status).toBe('200')
    expect(response.body).toBe('Good Morning Lambda!')
  })

  it('Should handle a POST request with binary and return a 200 response', async () => {
    const array = new Uint8Array([0xc0, 0xff, 0xee])
    const buffer = Buffer.from(array)
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EXAMPLE123',
              eventType: 'viewer-request',
              requestId: 'exampleRequestId',
            },
            request: {
              clientIp: '123.123.123.123',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
                'content-type': [
                  {
                    key: 'Content-Type',
                    value: 'application/x-www-form-urlencoded',
                  },
                ],
              },
              method: 'POST',
              querystring: '',
              uri: '/post/binary',
              body: {
                inputTruncated: false,
                action: 'read-only',
                encoding: 'base64',
                data: buffer.toString('base64'),
              },
            },
          },
        },
      ],
    }

    const response = await handler(event)
    expect(response.status).toBe('200')
    expect(response.body).toBe('3 bytes')
  })

  it('Should handle a request and return a 401 response with Basic auth', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EXAMPLE123',
              eventType: 'viewer-request',
              requestId: 'exampleRequestId',
            },
            request: {
              clientIp: '123.123.123.123',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
                'content-type': [
                  {
                    key: 'Content-Type',
                    value: 'plain/text',
                  },
                ],
              },
              method: 'GET',
              querystring: '',
              uri: '/auth/abc',
            },
          },
        },
      ],
    }

    const response = await handler(event)

    expect(response.status).toBe('401')
  })

  it('Should handle a request and return a 401 response with Basic auth', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EXAMPLE123',
              eventType: 'viewer-request',
              requestId: 'exampleRequestId',
            },
            request: {
              clientIp: '123.123.123.123',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
                'content-type': [
                  {
                    key: 'Content-Type',
                    value: 'plain/text',
                  },
                ],
              },
              method: 'GET',
              querystring: '',
              uri: '/auth/abc',
            },
          },
        },
      ],
    }

    const response = await handler(event)

    expect(response.status).toBe('401')
  })

  it('Should call a callback to continue processing the request', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EXAMPLE123',
              eventType: 'viewer-request',
              requestId: 'exampleRequestId',
            },
            request: {
              clientIp: '123.123.123.123',
              headers: {},
              method: 'GET',
              querystring: '',
              uri: '/callback/request',
            },
          },
        },
      ],
    }

    let called = false
    let requestClientIp = ''

    await handler(event, {}, (_err, result) => {
      if (result && 'clientIp' in result) {
        requestClientIp = result.clientIp
      }
      called = true
    })

    expect(called).toBe(true)
    expect(requestClientIp).toBe('123.123.123.123')
  })

  it('Should call a callback to continue processing the response', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EDFDVBD6EXAMPLE',
              eventType: 'viewer-response',
              requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
            },
            request: {
              clientIp: '203.0.113.178',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
                'user-agent': [
                  {
                    key: 'User-Agent',
                    value: 'curl/7.66.0',
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
              uri: '/callback/response',
            },
            response: {
              headers: {
                'access-control-allow-credentials': [
                  {
                    key: 'Access-Control-Allow-Credentials',
                    value: 'true',
                  },
                ],
                'access-control-allow-origin': [
                  {
                    key: 'Access-Control-Allow-Origin',
                    value: '*',
                  },
                ],
                date: [
                  {
                    key: 'Date',
                    value: 'Mon, 13 Jan 2020 20:14:56 GMT',
                  },
                ],
                'referrer-policy': [
                  {
                    key: 'Referrer-Policy',
                    value: 'no-referrer-when-downgrade',
                  },
                ],
                server: [
                  {
                    key: 'Server',
                    value: 'ExampleCustomOriginServer',
                  },
                ],
                'x-content-type-options': [
                  {
                    key: 'X-Content-Type-Options',
                    value: 'nosniff',
                  },
                ],
                'x-frame-options': [
                  {
                    key: 'X-Frame-Options',
                    value: 'DENY',
                  },
                ],
                'x-xss-protection': [
                  {
                    key: 'X-XSS-Protection',
                    value: '1; mode=block',
                  },
                ],
                age: [
                  {
                    key: 'Age',
                    value: '2402',
                  },
                ],
                'content-type': [
                  {
                    key: 'Content-Type',
                    value: 'text/html; charset=utf-8',
                  },
                ],
                'content-length': [
                  {
                    key: 'Content-Length',
                    value: '9593',
                  },
                ],
              },
              status: '200',
              statusDescription: 'OK',
            },
          },
        },
      ],
    }

    interface CloudFrontHeaders {
      [name: string]: [
        {
          key: string
          value: string
        }
      ]
    }
    let called = false
    let headers: CloudFrontHeaders = {}
    await handler(event, {}, (_err, result) => {
      if (result && result.headers) {
        headers = result.headers as CloudFrontHeaders
      }
      called = true
    })

    expect(called).toBe(true)
    expect(headers['access-control-allow-credentials']).toEqual([
      {
        key: 'Access-Control-Allow-Credentials',
        value: 'true',
      },
    ])
    expect(headers['access-control-allow-origin']).toEqual([
      {
        key: 'Access-Control-Allow-Origin',
        value: '*',
      },
    ])
  })

  it('Should handle a GET request and add header (Lambda@Edge viewer response)', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EDFDVBD6EXAMPLE',
              eventType: 'viewer-response',
              requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
            },
            request: {
              clientIp: '203.0.113.178',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
                'user-agent': [
                  {
                    key: 'User-Agent',
                    value: 'curl/7.66.0',
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
              uri: '/header/add',
            },
            response: {
              headers: {
                'access-control-allow-credentials': [
                  {
                    key: 'Access-Control-Allow-Credentials',
                    value: 'true',
                  },
                ],
                'access-control-allow-origin': [
                  {
                    key: 'Access-Control-Allow-Origin',
                    value: '*',
                  },
                ],
                date: [
                  {
                    key: 'Date',
                    value: 'Mon, 13 Jan 2020 20:14:56 GMT',
                  },
                ],
                'referrer-policy': [
                  {
                    key: 'Referrer-Policy',
                    value: 'no-referrer-when-downgrade',
                  },
                ],
                server: [
                  {
                    key: 'Server',
                    value: 'ExampleCustomOriginServer',
                  },
                ],
                'x-content-type-options': [
                  {
                    key: 'X-Content-Type-Options',
                    value: 'nosniff',
                  },
                ],
                'x-frame-options': [
                  {
                    key: 'X-Frame-Options',
                    value: 'DENY',
                  },
                ],
                'x-xss-protection': [
                  {
                    key: 'X-XSS-Protection',
                    value: '1; mode=block',
                  },
                ],
                age: [
                  {
                    key: 'Age',
                    value: '2402',
                  },
                ],
                'content-type': [
                  {
                    key: 'Content-Type',
                    value: 'text/html; charset=utf-8',
                  },
                ],
                'content-length': [
                  {
                    key: 'Content-Length',
                    value: '9593',
                  },
                ],
              },
              status: '200',
              statusDescription: 'OK',
            },
          },
        },
      ],
    }

    interface CloudFrontHeaders {
      [name: string]: [
        {
          key: string
          value: string
        }
      ]
    }
    let called = false
    let headers: CloudFrontHeaders = {}
    await handler(event, {}, (_err, result) => {
      if (result && result.headers) {
        headers = result.headers as CloudFrontHeaders
      }
      called = true
    })

    expect(called).toBe(true)
    expect(headers['strict-transport-security']).toEqual([
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubdomains; preload',
      },
    ])
    expect(headers['x-custom']).toEqual([
      {
        key: 'X-Custom',
        value: 'Foo',
      },
    ])
  })

  it('Callback Event (Lambda@Edge response)', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EDFDVBD6EXAMPLE',
              eventType: 'viewer-response',
              requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
            },
            request: {
              clientIp: '203.0.113.178',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
              },
              method: 'GET',
              querystring: '',
              uri: '/config/eventCheck',
            },
          },
        },
      ],
    }

    let called = false
    await handler(event, {}, () => {
      called = true
    })

    expect(called).toBe(true)
  })

  it('Should return a response where bodyEncoding is "base64" with binary', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EXAMPLE123',
              eventType: 'viewer-request',
              requestId: 'exampleRequestId',
            },
            request: {
              clientIp: '123.123.123.123',
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'example.com',
                  },
                ],
              },
              method: 'GET',
              querystring: '',
              uri: '/binary',
            },
          },
        },
      ],
    }

    const response = await handler(event)

    expect(response.body).toBe('RmFrZSBJbWFnZQ==') // base64 encoded "Fake Image"
    expect(response.bodyEncoding).toBe('base64')
  })
})
