import { Hono } from '../../hono'
import { isContentTypeBinary, isContentEncodingBinary,  handle } from './handler'
import type { ALBProxyEvent } from './handler'

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
    expect(isContentTypeBinary('application/json; charset=UTF-8')).toBe(false)
  })
})

describe('isContentEncodingBinary', () => {
  it('Should determine whether it is compressed', () => {
    expect(isContentEncodingBinary('gzip')).toBe(true)
    expect(isContentEncodingBinary('compress')).toBe(true)
    expect(isContentEncodingBinary('deflate')).toBe(true)
    expect(isContentEncodingBinary('br')).toBe(true)
    expect(isContentEncodingBinary('deflate, gzip')).toBe(true)
    expect(isContentEncodingBinary('')).toBe(false)
    expect(isContentEncodingBinary('unknown')).toBe(false)
  })
})

describe('handle', () => {
  const dummyLambdaContext = {
    awsRequestId: '',
    callbackWaitsForEmptyEventLoop: false,
    functionName: '',
    functionVersion: '',
    invokedFunctionArn: '',
    logGroupName: '',
    logStreamName: '',
    memoryLimitInMB: '',
    getRemainingTimeInMillis(): number {
      return 0
    }
  }

  describe('ALB', () => {
    const app = new Hono().post('/', (c) => {
      return c.json({ message: 'ok' })
    })
    const handler = handle(app)

    it('Should accept single value headers', async () => {
      const event: ALBProxyEvent = {
        body: '{}',
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/',
        headers: {
          host: 'localhost',
        },
        requestContext: {
          elb: {
            targetGroupArn: '',
          }
        }
      }
      const response = await handler(event, dummyLambdaContext)
      expect(response?.['statusCode']).toEqual(200)
    })

    it('Should accept multi value headers', async () => {
      const event: ALBProxyEvent = {
        body: '{}',
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/',
        multiValueHeaders: {
          host: ['localhost'],
        },
        requestContext: {
          elb: {
            targetGroupArn: '',
          }
        }
      }
      const response = await handler(event, dummyLambdaContext)
      expect(response?.['statusCode']).toEqual(200)
    })
  })
})