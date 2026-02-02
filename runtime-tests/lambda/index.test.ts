import { Readable } from 'stream'
import {
  ALBProcessor,
  EventV1Processor,
  EventV2Processor,
  getProcessor,
  handle,
  streamHandle,
} from '../../src/adapter/aws-lambda/handler'
import type {
  ALBProxyEvent,
  APIGatewayProxyEventV2,
  LatticeProxyEventV2,
  LambdaEvent,
} from '../../src/adapter/aws-lambda/handler'
import type {
  ApiGatewayRequestContext,
  ApiGatewayRequestContextV2,
  LatticeRequestContextV2,
  LambdaContext,
} from '../../src/adapter/aws-lambda/types'
import { getCookie, setCookie } from '../../src/helper/cookie'
import { streamSSE } from '../../src/helper/streaming'
import { Hono } from '../../src/hono'
import { basicAuth } from '../../src/middleware/basic-auth'
import './mock'

type Bindings = {
  event: LambdaEvent
  lambdaContext: LambdaContext
  requestContext: ApiGatewayRequestContext | ApiGatewayRequestContextV2
}

const testApiGatewayRequestContextV2 = {
  accountId: '123456789012',
  apiId: 'urlid',
  authentication: null,
  authorizer: {
    iam: {
      accessKey: 'AKIA...',
      accountId: '111122223333',
      callerId: 'AIDA...',
      cognitoIdentity: null,
      principalOrgId: null,
      userArn: 'arn:aws:iam::111122223333:user/example-user',
      userId: 'AIDA...',
    },
  },
  domainName: 'example.com',
  domainPrefix: '<url-id>',
  http: {
    method: 'POST',
    path: '/my/path',
    protocol: 'HTTP/1.1',
    sourceIp: '123.123.123.123',
    userAgent: 'agent',
  },
  requestId: 'id',
  routeKey: '$default',
  stage: '$default',
  time: '12/Mar/2020:19:03:58 +0000',
  timeEpoch: 1583348638390,
  customProperty: 'customValue',
}

const testLatticeRequestContext: LatticeRequestContextV2 = {
  serviceNetworkArn: 'arn:aws:vpc-lattice:us-east-1:111122223333:servicenetwork/sn-a1b2c3',
  serviceArn: 'arn:aws:vpc-lattice:us-east-1:111122223333:service/svc-a1b2c3',
  targetGroupArn: 'arn:aws:vpc-lattice:us-east-1:111122223333:targetgroup/tg-a1b2c3',
  region: 'us-east-1',
  timeEpoch: '1759915938150314',
  identity: {
    sourceVpcArn: 'arn:aws:ec2:us-east-1:111122223333:vpc/vpc-a1b2c3',
  },
}

describe('AWS Lambda Adapter for Hono', () => {
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

  app.post('/post/binary', async (c) => {
    const body = await c.req.blob()
    return c.text(`${body.size} bytes`)
  })

  const username = 'hono-user-a'
  const password = 'hono-password-a'
  app.use('/auth/*', basicAuth({ username, password }))
  app.get('/auth/abc', (c) => c.text('Good Night Lambda!'))

  app.get('/lambda-event', (c) => {
    const event = c.env.event
    return c.json(event)
  })

  app.get('/lambda-context', (c) => {
    const fnctx = c.env.lambdaContext
    return c.json(fnctx)
  })

  app.get('/custom-context/v1/apigw', (c) => {
    const lambdaContext = c.env.requestContext
    return c.json(lambdaContext)
  })

  app.get('/custom-context/apigw', (c) => {
    const lambdaContext = c.env.event.requestContext
    return c.json(lambdaContext)
  })

  app.get('/custom-context/v1/lambda', (c) => {
    const lambdaContext = c.env.requestContext
    return c.json(lambdaContext)
  })

  app.get('/custom-context/lambda', (c) => {
    const lambdaContext = c.env.event.requestContext
    return c.json(lambdaContext)
  })

  app.get('/query-params', (c) => {
    const queryParams = c.req.query()
    return c.json(queryParams)
  })

  app.get('/multi-query-params', (c) => {
    const multiQueryParams = c.req.queries()
    return c.json(multiQueryParams)
  })

  const testCookie1 = {
    key: 'id',
    value: crypto.randomUUID(),
    get serialized() {
      return `${this.key}=${this.value}; Path=/`
    },
  }
  const testCookie2 = {
    key: 'secret',
    value: crypto.randomUUID(),
    get serialized() {
      return `${this.key}=${this.value}; Path=/`
    },
  }

  app.post('/cookie', (c) => {
    setCookie(c, testCookie1.key, testCookie1.value)
    setCookie(c, testCookie2.key, testCookie2.value)
    return c.text('Cookies Set')
  })

  app.get('/cookie', (c) => {
    const validCookies =
      getCookie(c, testCookie1.key) === testCookie1.value &&
      getCookie(c, testCookie2.key) === testCookie2.value
    if (!validCookies) {
      return c.text('Invalid Cookies')
    }
    return c.text('Valid Cookies')
  })

  app.post('/headers', (c) => {
    if (c.req.header('foo')?.includes('bar')) {
      return c.json({ message: 'ok' })
    }
    return c.json({ message: 'fail' }, 400)
  })

  const handler = handle(app)

  const testApiGatewayRequestContext = {
    accountId: '123456789012',
    apiId: 'id',
    authorizer: {
      claims: null,
      scopes: null,
    },
    domainName: 'example.com',
    domainPrefix: 'id',
    extendedRequestId: 'request-id',
    httpMethod: 'GET',
    identity: {
      sourceIp: 'IP',
      userAgent: 'user-agent',
    },
    path: '/my/path',
    protocol: 'HTTP/1.1',
    requestId: 'id=',
    requestTime: '04/Mar/2020:19:15:17 +0000',
    requestTimeEpoch: 1583349317135,
    resourcePath: '/',
    stage: '$default',
    customProperty: 'customValue',
  }

  const testALBRequestContext = {
    elb: {
      targetGroupArn:
        'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/lambda-279XGJDqGZ5rsrHC2Fjr/49e9d65c45c6791a',
    },
  }

  it('Should handle a GET request and return a 200 response', async () => {
    const event = {
      version: '1.0',
      resource: '/',
      httpMethod: 'GET',
      headers: { 'content-type': 'text/plain' },
      path: '/',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Hello Lambda!')
    expect(response.headers['content-type']).toMatch(/^text\/plain/)
    expect(response.multiValueHeaders).toBeUndefined()
    expect(response.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 200 response with binary', async () => {
    const event = {
      version: '1.0',
      resource: '/binary',
      httpMethod: 'GET',
      headers: {},
      path: '/binary',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('RmFrZSBJbWFnZQ==')
    expect(response.headers['content-type']).toMatch(/^image\/png/)
    expect(response.multiValueHeaders).toBeUndefined()
    expect(response.isBase64Encoded).toBe(true)
  })

  it('Should handle a GET request and return a 200 response (LambdaFunctionUrlEvent)', async () => {
    const event = {
      version: '2.0',
      routeKey: '$default',
      headers: { 'content-type': 'text/plain' },
      rawPath: '/',
      rawQueryString: '',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContextV2,
    }

    testApiGatewayRequestContextV2.http.method = 'GET'

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Hello Lambda!')
    expect(response.headers['content-type']).toMatch(/^text\/plain/)
    expect(response.multiValueHeaders).toBeUndefined()
    expect(response.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 200 response (ALBEvent)', async () => {
    const event = {
      headers: { 'content-type': 'text/plain' },
      httpMethod: 'GET',
      path: '/',
      queryStringParameters: {
        query: '1234ABCD',
      },
      body: null,
      isBase64Encoded: false,
      requestContext: testALBRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Hello Lambda!')
    expect(response.headers['content-type']).toMatch(/^text\/plain/)
    expect(response.multiValueHeaders).toBeUndefined()
    expect(response.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 200 response (LatticeProxyEvent)', async () => {
    const event: LatticeProxyEventV2 = {
      version: '2.0',
      path: '/?query=1234ABCD',
      method: 'GET',
      headers: { 'content-type': ['text/plain'] },
      queryStringParameters: {},
      body: null,
      isBase64Encoded: false,
      requestContext: testLatticeRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Hello Lambda!')
    expect(response.headers['content-type']).toMatch(/^text\/plain/)
    expect(response.multiValueHeaders).toBeUndefined()
    expect(response.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 404 response', async () => {
    const event = {
      version: '1.0',
      resource: '/nothing',
      httpMethod: 'GET',
      headers: { 'content-type': 'text/plain' },
      path: '/nothing',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(404)
  })

  it('Should handle a POST request and return a 200 response', async () => {
    const searchParam = new URLSearchParams()
    searchParam.append('message', 'Good Morning Lambda!')
    const event = {
      version: '1.0',
      resource: '/post',
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      path: '/post',
      body: Buffer.from(searchParam.toString()).toString('base64'),
      isBase64Encoded: true,
      requestContext: testApiGatewayRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Good Morning Lambda!')
  })

  it('Should handle a POST request and return a 200 response (LambdaFunctionUrlEvent)', async () => {
    const searchParam = new URLSearchParams()
    searchParam.append('message', 'Good Morning Lambda!')
    const event = {
      version: '2.0',
      routeKey: '$default',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      rawPath: '/post',
      rawQueryString: '',
      body: Buffer.from(searchParam.toString()).toString('base64'),
      isBase64Encoded: true,
      requestContext: testApiGatewayRequestContextV2,
    }

    testApiGatewayRequestContextV2.http.method = 'POST'

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Good Morning Lambda!')
  })

  it('Should handle a POST request with binary and return a 200 response', async () => {
    const array = new Uint8Array([0xc0, 0xff, 0xee])
    const buffer = Buffer.from(array)
    const event = {
      version: '1.0',
      resource: '/post/binary',
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      path: '/post/binary',
      body: buffer.toString('base64'),
      isBase64Encoded: true,
      requestContext: testApiGatewayRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('3 bytes')
  })

  it('Should handle a request and return a 401 response with Basic auth', async () => {
    const event = {
      version: '1.0',
      resource: '/auth/abc',
      httpMethod: 'GET',
      headers: {
        'Content-Type': 'plain/text',
      },
      path: '/auth/abc',
      body: null,
      isBase64Encoded: true,
      requestContext: testApiGatewayRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(401)
  })

  it('Should handle a request and return a 200 response with Basic auth', async () => {
    const credential = 'aG9uby11c2VyLWE6aG9uby1wYXNzd29yZC1h'
    const event = {
      version: '1.0',
      resource: '/auth/abc',
      httpMethod: 'GET',
      headers: {
        'Content-Type': 'plain/text',
        Authorization: `Basic ${credential}`,
      },
      path: '/auth/abc',
      body: null,
      isBase64Encoded: true,
      requestContext: testApiGatewayRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Good Night Lambda!')
  })

  it('Should handle a GET request and return custom context', async () => {
    const event = {
      version: '1.0',
      resource: '/custom-context/apigw',
      httpMethod: 'GET',
      headers: { 'content-type': 'application/json' },
      path: '/custom-context/apigw',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContext,
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body).customProperty).toEqual('customValue')
  })

  it('Should handle a GET request and context', async () => {
    const event = {
      version: '1.0',
      resource: '/lambda-context',
      httpMethod: 'GET',
      headers: { 'content-type': 'application/json' },
      path: '/lambda-context',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContext,
    }
    const context: LambdaContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'myLambdaFunction',
      functionVersion: '1.0.0',
      invokedFunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:myLambdaFunction',
      memoryLimitInMB: '128',
      awsRequestId: 'c6af9ac6-a7b0-11e6-80f5-76304dec7eb7',
      logGroupName: '/aws/lambda/myLambdaFunction',
      logStreamName: '2016/11/14/[$LATEST]f2d4b21cfb33490da2e8f8ef79a483s4',
      getRemainingTimeInMillis: () => {
        return 60000 // 60 seconds
      },
    }
    const response = await handler(event, context)
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body).callbackWaitsForEmptyEventLoop).toEqual(false)
  })

  it('Should handle a POST request and return a 200 response with cookies set (APIGatewayProxyEvent V1 and V2)', async () => {
    const apiGatewayEvent = {
      version: '1.0',
      resource: '/cookie',
      httpMethod: 'POST',
      headers: { 'content-type': 'text/plain' },
      path: '/cookie',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContext,
    }

    const apiGatewayResponse = await handler(apiGatewayEvent)

    expect(apiGatewayResponse.statusCode).toBe(200)
    expect(apiGatewayResponse.multiValueHeaders).toHaveProperty('set-cookie', [
      testCookie1.serialized,
      testCookie2.serialized,
    ])

    const apiGatewayEventV2 = {
      version: '2.0',
      routeKey: '$default',
      httpMethod: 'POST',
      headers: { 'content-type': 'text/plain' },
      rawPath: '/cookie',
      rawQueryString: '',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContextV2,
    }

    const apiGatewayResponseV2 = await handler(apiGatewayEventV2)

    expect(apiGatewayResponseV2.statusCode).toBe(200)
    expect(apiGatewayResponseV2).toHaveProperty('cookies', [
      testCookie1.serialized,
      testCookie2.serialized,
    ])
  })

  it('Should handle a POST request and return a 200 response with cookies set (LatticeProxyEvent V2)', async () => {
    const latticeProxyEvent: LatticeProxyEventV2 = {
      version: '2.0',
      path: '/cookie',
      method: 'POST',
      headers: { 'content-type': ['text/plain'] },
      queryStringParameters: {},
      body: null,
      isBase64Encoded: false,
      requestContext: testLatticeRequestContext,
    }

    const latticeResponse = await handler(latticeProxyEvent)

    expect(latticeResponse.statusCode).toBe(200)
    expect(latticeResponse.headers).toHaveProperty(
      'set-cookie',
      [testCookie1.serialized, testCookie2.serialized].join(', ')
    )
  })

  describe('headers', () => {
    describe('single-value headers', () => {
      it('Should extract single-value headers and return 200 (ALBProxyEvent)', async () => {
        const event = {
          body: '{}',
          httpMethod: 'POST',
          isBase64Encoded: false,
          path: '/headers',
          headers: {
            host: 'localhost',
            foo: 'bar',
          },
          requestContext: testALBRequestContext,
        }
        const albResponse = await handler(event)
        expect(albResponse.statusCode).toBe(200)
        expect(albResponse.headers).toEqual(
          expect.objectContaining({
            'content-type': 'application/json',
          })
        )
        expect(albResponse.multiValueHeaders).toBeUndefined()
      })

      it('Should extract single-value headers and return 200 (APIGatewayProxyEvent)', async () => {
        const apigatewayProxyEvent = {
          version: '1.0',
          resource: '/headers',
          httpMethod: 'POST',
          headers: {
            host: 'localhost',
            foo: 'bar',
          },
          path: '/headers',
          body: null,
          isBase64Encoded: false,
          requestContext: testApiGatewayRequestContext,
        }
        const apiGatewayResponseV2 = await handler(apigatewayProxyEvent)
        expect(apiGatewayResponseV2.statusCode).toBe(200)
      })

      it('Should extract single-value headers and return 200 (APIGatewayProxyEventV2)', async () => {
        const apigatewayProxyV2Event = {
          version: '2.0',
          routeKey: '$default',
          headers: {
            host: 'localhost',
            foo: 'bar',
          },
          rawPath: '/headers',
          rawQueryString: '',
          requestContext: testApiGatewayRequestContextV2,
          resource: '/headers',
          body: null,
          isBase64Encoded: false,
        }
        const apiGatewayResponseV2 = await handler(apigatewayProxyV2Event)
        expect(apiGatewayResponseV2.statusCode).toBe(200)
      })
    })

    describe('multi-value headers', () => {
      it('Should extract multi-value headers and return 200 (ALBProxyEvent)', async () => {
        const event = {
          body: '{}',
          httpMethod: 'POST',
          isBase64Encoded: false,
          path: '/headers',
          multiValueHeaders: {
            host: ['localhost'],
            foo: ['bar'],
          },
          requestContext: testALBRequestContext,
        }
        const albResponse = await handler(event)
        expect(albResponse.statusCode).toBe(200)
        expect(albResponse.multiValueHeaders).toBeDefined()
        expect(albResponse.multiValueHeaders).toEqual(
          expect.objectContaining({
            'content-type': ['application/json'],
          })
        )
      })

      it('Should extract multi-value headers and return 200 (APIGatewayProxyEvent)', async () => {
        const apigatewayProxyEvent = {
          version: '1.0',
          resource: '/headers',
          httpMethod: 'POST',
          headers: {},
          multiValueHeaders: {
            host: ['localhost'],
            foo: ['bar'],
          },
          path: '/headers',
          body: null,
          isBase64Encoded: false,
          requestContext: testApiGatewayRequestContext,
        }
        const apiGatewayResponseV2 = await handler(apigatewayProxyEvent)
        expect(apiGatewayResponseV2.statusCode).toBe(200)
      })

      it('Should extract multi-value headers and return 200 (LatticeProxyEvent)', async () => {
        const event: LatticeProxyEventV2 = {
          version: '2.0',
          path: '/headers',
          method: 'POST',
          headers: {
            host: ['localhost'],
            foo: ['bar'],
          },
          queryStringParameters: {},
          body: null,
          isBase64Encoded: false,
          requestContext: testLatticeRequestContext,
        }

        const response = await handler(event)

        expect(response.statusCode).toBe(200)
      })
    })
  })

  it('Should handle a POST request and return a 200 response if cookies match (APIGatewayProxyEvent V1 and V2)', async () => {
    const apiGatewayEvent = {
      version: '1.0',
      resource: '/cookie',
      httpMethod: 'GET',
      headers: {
        'content-type': 'text/plain',
        cookie: [testCookie1.serialized, testCookie2.serialized].join('; '),
      },
      path: '/cookie',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContext,
    }

    const apiGatewayResponse = await handler(apiGatewayEvent)

    expect(apiGatewayResponse.statusCode).toBe(200)
    expect(apiGatewayResponse.body).toBe('Valid Cookies')
    expect(apiGatewayResponse.headers['content-type']).toMatch(/^text\/plain/)
    expect(apiGatewayResponse.isBase64Encoded).toBe(false)

    const apiGatewayEventV2 = {
      version: '2.0',
      routeKey: '$default',
      headers: { 'content-type': 'text/plain' },
      rawPath: '/cookie',
      cookies: [testCookie1.serialized, testCookie2.serialized],
      rawQueryString: '',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContextV2,
    }
    testApiGatewayRequestContextV2.http.method = 'GET'

    const apiGatewayResponseV2 = await handler(apiGatewayEventV2)

    expect(apiGatewayResponseV2.statusCode).toBe(200)
    expect(apiGatewayResponseV2.body).toBe('Valid Cookies')
    expect(apiGatewayResponseV2.headers['content-type']).toMatch(/^text\/plain/)
    expect(apiGatewayResponseV2.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 200 response if cookies match (ALBProxyEvent) with default headers', async () => {
    const albEventDefaultHeaders = {
      version: '1.0',
      resource: '/cookie',
      httpMethod: 'GET',
      headers: {
        'content-type': 'text/plain',
        cookie: [testCookie1.serialized, testCookie2.serialized].join('; '),
      },
      path: '/cookie',
      body: null,
      isBase64Encoded: false,
      requestContext: testALBRequestContext,
    }

    const albResponse = await handler(albEventDefaultHeaders)

    expect(albResponse.statusCode).toBe(200)
    expect(albResponse.body).toBe('Valid Cookies')
    expect(albResponse.headers['content-type']).toMatch(/^text\/plain/)
    expect(albResponse.multiValueHeaders).toBeUndefined()
    expect(albResponse.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 200 response if cookies match (ALBProxyEvent) with multi value headers', async () => {
    const albEventMultiValueHeaders = {
      version: '1.0',
      resource: '/cookie',
      httpMethod: 'GET',
      multiValueHeaders: {
        'content-type': ['text/plain'],
        cookie: [testCookie1.serialized, testCookie2.serialized],
      },
      path: '/cookie',
      body: null,
      isBase64Encoded: false,
      requestContext: testALBRequestContext,
    }

    const albResponse = await handler(albEventMultiValueHeaders)

    expect(albResponse.statusCode).toBe(200)
    expect(albResponse.body).toBe('Valid Cookies')
    expect(albResponse.headers).toBeUndefined()
    expect(albResponse.multiValueHeaders['content-type']).toEqual([
      expect.stringMatching(/^text\/plain/),
    ])
    expect(albResponse.isBase64Encoded).toBe(false)
  })

  it('Should handle a POST request and return a 200 response with cookies (ALBProxyEvent) with default headers', async () => {
    const albEventDefaultHeaders = {
      version: '1.0',
      resource: '/cookie',
      httpMethod: 'POST',
      headers: {
        'content-type': 'text/plain',
        cookie: [testCookie1.serialized, testCookie2.serialized].join(', '),
      },
      path: '/cookie',
      body: null,
      isBase64Encoded: false,
      requestContext: testALBRequestContext,
    }

    const albResponse = await handler(albEventDefaultHeaders)

    expect(albResponse.statusCode).toBe(200)
    expect(albResponse.body).toBe('Cookies Set')
    expect(albResponse.headers['content-type']).toMatch(/^text\/plain/)
    expect(albResponse.multiValueHeaders).toBeUndefined()
    expect(albResponse.headers['set-cookie']).toEqual(
      [testCookie1.serialized, testCookie2.serialized].join(', ')
    )
    expect(albResponse.isBase64Encoded).toBe(false)
  })

  it('Should handle a POST request and return a 200 response with cookies (ALBProxyEvent) with multi value headers', async () => {
    const albEventDefaultHeaders = {
      version: '1.0',
      resource: '/cookie',
      httpMethod: 'POST',
      multiValueHeaders: {
        'content-type': ['text/plain'],
        cookie: [testCookie1.serialized, testCookie2.serialized],
      },
      path: '/cookie',
      body: null,
      isBase64Encoded: false,
      requestContext: testALBRequestContext,
    }

    const albResponse = await handler(albEventDefaultHeaders)

    expect(albResponse.statusCode).toBe(200)
    expect(albResponse.body).toBe('Cookies Set')
    expect(albResponse.headers).toBeUndefined()
    expect(albResponse.multiValueHeaders['set-cookie']).toEqual(
      expect.arrayContaining([testCookie1.serialized, testCookie2.serialized])
    )
    expect(albResponse.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 200 response with queryStringParameters (ALBProxyEvent)', async () => {
    const albEventDefaultHeaders = {
      resource: '/query-params',
      httpMethod: 'GET',
      headers: {
        'content-type': 'application/json',
      },
      queryStringParameters: {
        key1: 'value1',
        key2: 'value2',
      },
      path: '/query-params',
      body: null,
      isBase64Encoded: false,
      requestContext: testALBRequestContext,
    }

    const albResponse = await handler(albEventDefaultHeaders)

    expect(albResponse.statusCode).toBe(200)
    expect(albResponse.body).toContain(
      JSON.stringify({
        key1: 'value1',
        key2: 'value2',
      })
    )
    expect(albResponse.headers['content-type']).toMatch(/^application\/json/)
    expect(albResponse.multiValueHeaders).toBeUndefined()
    expect(albResponse.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 200 response with single value multiQueryStringParameters (ALBProxyEvent)', async () => {
    const albEventDefaultHeaders = {
      resource: '/query-params',
      httpMethod: 'GET',
      multiValueHeaders: {
        'content-type': ['application/json'],
      },
      multiValueQueryStringParameters: {
        key1: ['value1'],
        key2: ['value2'],
      },
      path: '/query-params',
      body: null,
      isBase64Encoded: false,
      requestContext: testALBRequestContext,
    }

    const albResponse = await handler(albEventDefaultHeaders)

    expect(albResponse.statusCode).toBe(200)
    expect(albResponse.body).toContain(
      JSON.stringify({
        key1: 'value1',
        key2: 'value2',
      })
    )
    expect(albResponse.headers).toBeUndefined()
    expect(albResponse.multiValueHeaders['content-type']).toEqual([
      expect.stringMatching(/^application\/json/),
    ])
    expect(albResponse.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 200 response with multi value multiQueryStringParameters (ALBProxyEvent)', async () => {
    const albEventDefaultHeaders = {
      resource: '/query-params',
      httpMethod: 'GET',
      multiValueHeaders: {
        'content-type': ['application/json'],
      },
      multiValueQueryStringParameters: {
        key1: ['value1'],
        key2: ['value2', 'otherValue2'],
      },
      path: '/multi-query-params',
      body: null,
      isBase64Encoded: false,
      requestContext: testALBRequestContext,
    }

    const albResponse = await handler(albEventDefaultHeaders)

    expect(albResponse.statusCode).toBe(200)
    expect(albResponse.body).toContain(
      JSON.stringify({
        key1: ['value1'],
        key2: ['value2', 'otherValue2'],
      })
    )
    expect(albResponse.headers).toBeUndefined()
    expect(albResponse.multiValueHeaders['content-type']).toEqual([
      expect.stringMatching(/^application\/json/),
    ])
    expect(albResponse.isBase64Encoded).toBe(false)
  })
})

describe('streamHandle function', () => {
  const app = new Hono<{ Bindings: Bindings }>()

  app.get('/', (c) => {
    return c.text('Hello Lambda!')
  })

  app.get('/stream/text', async (c) => {
    return c.streamText(async (stream) => {
      for (let i = 0; i < 3; i++) {
        await stream.writeln(`${i}`)
        await stream.sleep(1)
      }
    })
  })

  app.get('/sse', async (c) => {
    return streamSSE(c, async (stream) => {
      let id = 0
      const maxIterations = 2

      while (id < maxIterations) {
        const message = `Message\nIt is ${id}`
        await stream.writeSSE({ data: message, event: 'time-update', id: String(id++) })
        await stream.sleep(10)
      }
    })
  })

  const handler = streamHandle(app)

  it('Should streamHandle a GET request and return a 200 response (LambdaFunctionUrlEvent)', async () => {
    const event = {
      headers: { 'content-type': ' binary/octet-stream' },
      rawPath: '/stream/text',
      rawQueryString: '',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContextV2,
    }

    testApiGatewayRequestContextV2.http.method = 'GET'

    const mockReadableStream = new Readable({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      read() {},
    })

    mockReadableStream.push('0\n')
    mockReadableStream.push('1\n')
    mockReadableStream.push('2\n')
    mockReadableStream.push('3\n')
    mockReadableStream.push(null) // EOF

    await handler(event, mockReadableStream)

    const chunks = []
    for await (const chunk of mockReadableStream) {
      chunks.push(chunk)
    }
    expect(chunks.join('')).toContain('0\n1\n2\n3\n')
  })

  it('Should handle a GET request for an SSE stream and return the correct chunks', async () => {
    const event = {
      headers: { 'content-type': 'text/event-stream' },
      rawPath: '/sse',
      rawQueryString: '',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContextV2,
    }

    testApiGatewayRequestContextV2.http.method = 'GET'

    const mockReadableStream = new Readable({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      read() {},
    })

    const initContentType = {
      'Content-Type': 'application/vnd.awslambda.http-integration-response',
    }
    mockReadableStream.push(JSON.stringify(initContentType))

    // Send JSON formatted response headers, followed by 8 NULL characters as a separator
    const httpResponseMetadata = {
      statusCode: 200,
      headers: { 'Custom-Header': 'value' },
      cookies: ['session=abcd1234'],
    }
    const jsonResponsePrelude = JSON.stringify(httpResponseMetadata) + Buffer.alloc(8, 0).toString()
    mockReadableStream.push(jsonResponsePrelude)

    mockReadableStream.push('data: Message\ndata: It is 0\n\n')
    mockReadableStream.push('data: Message\ndata: It is 1\n\n')
    mockReadableStream.push(null) // EOF

    await handler(event, mockReadableStream)

    const chunks = []
    for await (const chunk of mockReadableStream) {
      chunks.push(chunk)
    }

    // If you have chunks, you might want to convert them to strings before checking
    const output = Buffer.concat(chunks).toString()
    expect(output).toContain('data: Message\ndata: It is 0\n\n')
    expect(output).toContain('data: Message\ndata: It is 1\n\n')

    // Assertions for the newly added header and prelude
    expect(output).toContain('application/vnd.awslambda.http-integration-response')
    expect(output).toContain('Custom-Header')
    expect(output).toContain('session=abcd1234')

    // Check for JSON prelude and NULL sequence
    const nullSequence = '\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'
    expect(output).toContain(jsonResponsePrelude.replace(nullSequence, ''))
  })
})

describe('getProcessor function', () => {
  it('Should return ALBProcessor for an ALBProxyEvent event', () => {
    const event: ALBProxyEvent = {
      httpMethod: 'GET',
      path: '/',
      body: null,
      isBase64Encoded: false,
      requestContext: {
        elb: {
          targetGroupArn:
            'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/lambda-279XGJDqGZ5rsrHC2Fjr/49e9d65c45c6791a',
        },
      },
    }

    const processor = getProcessor(event)
    expect(processor).toBeInstanceOf(ALBProcessor)
  })

  it('Should return EventV1Processor for an event without requestContext', () => {
    const event = {
      httpMethod: 'GET',
      path: '/',
      body: null,
      isBase64Encoded: false,
    }

    // while LambdaEvent RequestContext property is mandatory, it can be absent when testing through invoke-api or AWS Console
    // in such cases, a V1 processor should be returned
    const processor = getProcessor(event as unknown as LambdaEvent)
    expect(processor).toBeInstanceOf(EventV1Processor)
  })

  it('Should return EventV2Processor for an APIGatewayProxyEventV2 event', () => {
    const event: APIGatewayProxyEventV2 = {
      version: '2.0',
      routeKey: '$default',
      headers: { 'content-type': 'text/plain' },
      rawPath: '/',
      rawQueryString: '',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContextV2,
    }

    const processor = getProcessor(event)
    expect(processor).toBeInstanceOf(EventV2Processor)
  })
})
