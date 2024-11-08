import { decodeBase64 } from '../../utils/encode'
import {
  isContentEncodingBinary,
  isContentTypeBinary,
  createRequest,
  createResponse,
} from './handler'
import type { AlibabaCloudFC3Event } from './types'

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
  it('Should return valid javascript Request object from alibaba cloud fc3 event', () => {
    const event: AlibabaCloudFC3Event = {
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

  it('Should return valid javascript Request object from alibaba cloud fc3 event with base64 encoded body', async () => {
    const event: AlibabaCloudFC3Event = {
      version: 'v1',
      rawPath: '/my/path',
      headers: {
        Accept: '*/*',
        'User-Agent': 'curl/7.81.0',
      },
      queryParameters: { parameter2: 'value' },
      body: 'UmVxdWVzdCBCb2R5',
      isBase64Encoded: true,
      requestContext: {
        accountId: '1234567890123456',
        domainName: 'hono-al-fc-test.us-east-1.fcapp.run',
        domainPrefix: 'hono-al-fc-test',
        requestId: '1-12345678-12345678-123456789012',
        time: '2024-11-07T07:52:56Z',
        timeEpoch: '1730965976961',
        http: {
          method: 'POST',
          path: '/my/path',
          protocol: 'HTTP/1.1',
          sourceIp: '1.2.3.4',
          userAgent: 'curl/7.81.0',
        },
      },
    }

    const request = createRequest(event)

    expect(request.method).toEqual('POST')
    expect(request.url).toEqual(
      'https://hono-al-fc-test.us-east-1.fcapp.run/my/path?parameter2=value'
    )
    const text = await request.text()
    expect(text).toEqual('Request Body')
  })

  it('Should return valid javascript Request object from alibaba cloud fc3 event with not base64 encoded body', async () => {
    const event: AlibabaCloudFC3Event = {
      version: 'v1',
      rawPath: '/my/path',
      headers: {
        Accept: '*/*',
        'User-Agent': 'curl/7.81.0',
      },
      queryParameters: { parameter2: 'value' },
      body: 'Request Body',
      isBase64Encoded: false,
      requestContext: {
        accountId: '1234567890123456',
        domainName: 'hono-al-fc-test.us-east-1.fcapp.run',
        domainPrefix: 'hono-al-fc-test',
        requestId: '1-12345678-12345678-123456789012',
        time: '2024-11-07T07:52:56Z',
        timeEpoch: '1730965976961',
        http: {
          method: 'POST',
          path: '/my/path',
          protocol: 'HTTP/1.1',
          sourceIp: '1.2.3.4',
          userAgent: 'curl/7.81.0',
        },
      },
    }

    const request = createRequest(event)

    const text = await request.text()
    expect(text).toEqual('Request Body')
  })

  it('Should handle escaped paths in request URL correctly', () => {
    const event: AlibabaCloudFC3Event = {
      version: 'v1',
      rawPath: '/my/path%E4%BD%A0%E5%A5%BD',
      headers: {
        Accept: '*/*',
        'User-Agent': 'curl/7.81.0',
      },
      queryParameters: {
        你好: '世界',
      },
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
          path: '/my/path你好',
          protocol: 'HTTP/1.1',
          sourceIp: '1.2.3.4',
          userAgent: 'curl/7.81.0',
        },
      },
    }

    const request = createRequest(event)

    expect(request.method).toEqual('GET')
    const requestUrl = new URL(request.url)
    expect(requestUrl.pathname).toEqual('/my/path%E4%BD%A0%E5%A5%BD')
    expect(requestUrl.searchParams.get('你好')).toEqual('世界')
    expect(Object.fromEntries(request.headers)).toEqual({
      accept: '*/*',
      'user-agent': 'curl/7.81.0',
    })
  })
})

describe('createResponse', () => {
  it('Should return valid alibaba cloud fc3 Response object from javascript Response', async () => {
    const response = new Response('Response Content', {
      headers: {
        'Content-Type': 'text/plain',
      },
    })

    const res = await createResponse(response)

    expect(res.statusCode).toEqual(200)
    expect(res.headers).toEqual({
      'content-type': 'text/plain',
    })
    expect(res.body).toEqual('Response Content')
    expect(res.isBase64Encoded).toEqual(false)
  })

  it('Should return valid alibaba cloud fc3 Response object from base64 encoded javascript Response', async () => {
    const response = new Response('Response Content', {
      headers: {
        'Content-Type': 'image/png',
      },
    })

    const res = await createResponse(response)

    expect(res.statusCode).toEqual(200)
    expect(res.headers).toEqual({
      'content-type': 'image/png',
    })
    expect(res.body).toEqual('UmVzcG9uc2UgQ29udGVudA==')
    expect(res.isBase64Encoded).toEqual(true)
  })

  it('Should return valid alibaba cloud fc3 Response object from compressed javascript Response', async () => {
    const body = 'Response Content'
    const plainResponse = new Response(body)
    const compressedStream = plainResponse.body?.pipeThrough(new CompressionStream('gzip'))

    const compressedResponse = new Response(compressedStream, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Encoding': 'gzip',
      },
    })

    const res = await createResponse(compressedResponse)

    expect(res.statusCode).toEqual(200)
    expect(res.headers).toEqual({
      'content-type': 'text/plain',
      'content-encoding': 'gzip',
    })

    const compressedBodyStream = new Response(decodeBase64(res.body)).body
    const decompressedStream = compressedBodyStream?.pipeThrough(new DecompressionStream('gzip'))
    const decompressedBody = await new Response(decompressedStream).text()

    expect(decompressedBody).toEqual('Response Content')
    expect(res.isBase64Encoded).toEqual(true)
  })
})
