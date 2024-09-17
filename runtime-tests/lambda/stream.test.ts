import { streamHandle } from '../../src/adapter/aws-lambda/handler'
import type { LambdaEvent } from '../../src/adapter/aws-lambda/handler'
import type {
  ApiGatewayRequestContext,
  ApiGatewayRequestContextV2,
  LambdaContext,
} from '../../src/adapter/aws-lambda/types'
import { Hono } from '../../src/hono'
import './stream-mock'

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
    method: 'GET',
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

describe('streamHandle function', () => {
  const app = new Hono<{ Bindings: Bindings }>()

  app.get('/cookies', async (c) => {
    c.res.headers.append('Set-Cookie', 'cookie1=value1')
    c.res.headers.append('Set-Cookie', 'cookie2=value2')
    return c.text('Cookies Set')
  })

  const handler = streamHandle(app)

  it('to write multiple cookies into the headers', async () => {
    const event = {
      headers: { 'content-type': 'text/plain' },
      rawPath: '/cookies',
      rawQueryString: '',
      body: null,
      isBase64Encoded: false,
      requestContext: testApiGatewayRequestContextV2,
    }

    const stream = await handler(event)

    const metadata = JSON.parse(stream.chunks[0].toString())
    expect(metadata.cookies).toEqual(['cookie1=value1', 'cookie2=value2'])
  })
})
