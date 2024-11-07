import { isContentEncodingBinary, isContentTypeBinary, createRequest } from './handler'
import type { AliyunFCEvent } from './types'

// copied from aws-lambda/handler.test.ts
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

// copied from aws-lambda/handler.test.ts
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

describe('createRequest', () => {
  it('Should return valid Request object from aliyun fc3 event', () => {
    const event: AliyunFCEvent = {
      version: 'v1',
      rawPath: '/my/path',
      headers: {
        Accept: '*/*',
        'User-Agent': 'curl/7.81.0',
      },
      queryParameters: { parameter2: 'value' },
      body: '',
      isBase64Encoded: true,
      requestContext: {
        accountId: '1234567890123456',
        domainName: 'hono-al-fc-test.us-east-1.fcapp.run',
        domainPrefix: 'hono-al-fc-test',
        requestId: '1-12345678-12345678-123456789012',
        time: '2024-11-07T07:52:56Z',
        timeEpoch: '1730965976961',
        http: {
          method: 'GET',
          path: '/my/path',
          protocol: 'HTTP/1.1',
          sourceIp: '1.2.3.4',
          userAgent: 'curl/7.81.0',
        },
      },
    }

    const request = createRequest(event)

    expect(request.method).toEqual('GET')
    expect(request.url).toEqual(
      'https://hono-al-fc-test.us-east-1.fcapp.run/my/path?parameter2=value'
    )
    expect(Object.fromEntries(request.headers)).toEqual({
      accept: '*/*',
      'user-agent': 'curl/7.81.0',
    })
  })
})
