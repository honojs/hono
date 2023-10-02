import type {
  ApiGatewayRequestContext,
  LambdaFunctionUrlRequestContext,
} from '../../src/adapter/aws-lambda/custom-context'
import { handle } from '../../src/adapter/aws-lambda/handler'
import type { LambdaContext } from '../../src/adapter/aws-lambda/types'
import { Hono } from '../../src/hono'
import { basicAuth } from '../../src/middleware/basic-auth'

type Bindings = {
  lambdaContext: LambdaContext
  requestContext: ApiGatewayRequestContext | LambdaFunctionUrlRequestContext
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

  app.get('/lambda-context', (c) => {
    const fnctx = c.env.lambdaContext
    return c.json(fnctx)
  })

  app.get('/custom-context/apigw', (c) => {
    const lambdaContext = c.env.requestContext
    return c.json(lambdaContext)
  })

  app.get('/custom-context/lambda', (c) => {
    const lambdaContext = c.env.requestContext
    return c.json(lambdaContext)
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

  const testLambdaFunctionUrlRequestContext = {
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

  it('Should handle a GET request and return a 200 response', async () => {
    const event = {
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
    expect(response.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 200 response with binary', async () => {
    const event = {
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
    expect(response.isBase64Encoded).toBe(true)
  })

  it('Should handle a GET request and return a 200 response (LambdaFunctionUrlEvent)', async () => {
    const event = {
      headers: { 'content-type': 'text/plain' },
      rawPath: '/',
      rawQueryString: '',
      body: null,
      isBase64Encoded: false,
      requestContext: testLambdaFunctionUrlRequestContext,
    }

    testLambdaFunctionUrlRequestContext.http.method = 'GET'

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Hello Lambda!')
    expect(response.headers['content-type']).toMatch(/^text\/plain/)
    expect(response.isBase64Encoded).toBe(false)
  })

  it('Should handle a GET request and return a 404 response', async () => {
    const event = {
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      rawPath: '/post',
      rawQueryString: '',
      body: Buffer.from(searchParam.toString()).toString('base64'),
      isBase64Encoded: true,
      requestContext: testLambdaFunctionUrlRequestContext,
    }

    testLambdaFunctionUrlRequestContext.http.method = 'POST'

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Good Morning Lambda!')
  })

  it('Should handle a POST request with binary and return a 200 response', async () => {
    const array = new Uint8Array([0xc0, 0xff, 0xee])
    const buffer = Buffer.from(array)
    const event = {
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
})
