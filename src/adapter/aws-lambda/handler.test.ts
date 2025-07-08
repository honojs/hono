import type { LambdaEvent } from './handler'
import { getProcessor, isContentEncodingBinary, defaultIsContentTypeBinary } from './handler'

describe('isContentTypeBinary', () => {
  it('Should determine whether it is binary', () => {
    expect(defaultIsContentTypeBinary('image/png')).toBe(true)
    expect(defaultIsContentTypeBinary('font/woff2')).toBe(true)
    expect(defaultIsContentTypeBinary('image/svg+xml')).toBe(false)
    expect(defaultIsContentTypeBinary('image/svg+xml; charset=UTF-8')).toBe(false)
    expect(defaultIsContentTypeBinary('text/plain')).toBe(false)
    expect(defaultIsContentTypeBinary('text/plain; charset=UTF-8')).toBe(false)
    expect(defaultIsContentTypeBinary('text/css')).toBe(false)
    expect(defaultIsContentTypeBinary('text/javascript')).toBe(false)
    expect(defaultIsContentTypeBinary('application/json')).toBe(false)
    expect(defaultIsContentTypeBinary('application/ld+json')).toBe(false)
    expect(defaultIsContentTypeBinary('application/json')).toBe(false)
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

describe('EventProcessor.createResult with contentTypsAsBinary', () => {
  it('Should encode as base64 when content-type is in contentTypesAsBinary array', async () => {
    const event: LambdaEvent = {
      version: '1.0',
      resource: '/my/path',
      path: '/my/path',
      httpMethod: 'GET',
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'id',
        authorizer: { claims: null, scopes: null },
        domainName: 'id.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'id',
        extendedRequestId: 'request-id',
        httpMethod: 'GET',
        identity: {
          sourceIp: '192.0.2.1',
          userAgent: 'user-agent',
          clientCert: {
            clientCertPem: 'CERT_CONTENT',
            subjectDN: 'www.example.com',
            issuerDN: 'Example issuer',
            serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
            validity: {
              notBefore: 'May 28 12:30:02 2019 GMT',
              notAfter: 'Aug  5 09:36:04 2021 GMT',
            },
          },
        },
        path: '/my/path',
        protocol: 'HTTP/1.1',
        requestId: 'id=',
        requestTime: '04/Mar/2020:19:15:17 +0000',
        requestTimeEpoch: 1583349317135,
        resourcePath: '/my/path',
        stage: '$default',
      },
      pathParameters: {},
      stageVariables: {},
      body: null,
      isBase64Encoded: false,
    }

    const processor = getProcessor(event)
    const response = new Response('test content', {
      headers: { 'content-type': 'application/custom' },
    })

    const result = await processor.createResult(event, response, {
      isContentTypeBinary: (contentType: string) => contentType === 'application/custom',
    })

    expect(result.isBase64Encoded).toBe(true)
    expect(result.body).toBe('dGVzdCBjb250ZW50')
  })

  it('Should not encode as base64 when content-type is not in isContentTypeBinary array', async () => {
    const event: LambdaEvent = {
      version: '1.0',
      resource: '/my/path',
      path: '/my/path',
      httpMethod: 'GET',
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'id',
        authorizer: { claims: null, scopes: null },
        domainName: 'id.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'id',
        extendedRequestId: 'request-id',
        httpMethod: 'GET',
        identity: {
          sourceIp: '192.0.2.1',
          userAgent: 'user-agent',
          clientCert: {
            clientCertPem: 'CERT_CONTENT',
            subjectDN: 'www.example.com',
            issuerDN: 'Example issuer',
            serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
            validity: {
              notBefore: 'May 28 12:30:02 2019 GMT',
              notAfter: 'Aug  5 09:36:04 2021 GMT',
            },
          },
        },
        path: '/my/path',
        protocol: 'HTTP/1.1',
        requestId: 'id=',
        requestTime: '04/Mar/2020:19:15:17 +0000',
        requestTimeEpoch: 1583349317135,
        resourcePath: '/my/path',
        stage: '$default',
      },
      pathParameters: {},
      stageVariables: {},
      body: null,
      isBase64Encoded: false,
    }

    const processor = getProcessor(event)
    const response = new Response('test content', {
      headers: { 'content-type': 'application/json' },
    })

    const result = await processor.createResult(event, response, {
      isContentTypeBinary: (contentType: string) => contentType === 'application/custom',
    })

    expect(result.isBase64Encoded).toBe(false)
    expect(result.body).toBe('test content')
  })
})

describe('EventProcessor.createRequest', () => {
  it('Should return valid Request object from version 1.0 API Gateway event', () => {
    const event: LambdaEvent = {
      version: '1.0',
      resource: '/my/path',
      path: '/my/path',
      httpMethod: 'GET',
      headers: {
        'content-type': 'application/json',
        header1: 'value1',
        header2: 'value1',
      },
      multiValueHeaders: {
        header1: ['value1'],
        header2: ['value1', 'value2', 'value3'],
      },
      // This value doesn't match multi value's content.
      // We want to assert handler is using the multi value's content when both are available.
      queryStringParameters: {
        parameter2: 'value',
      },
      multiValueQueryStringParameters: {
        parameter1: ['value1', 'value2'],
        parameter2: ['value'],
      },
      requestContext: {
        accountId: '123456789012',
        apiId: 'id',
        authorizer: {
          claims: null,
          scopes: null,
        },
        domainName: 'id.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'id',
        extendedRequestId: 'request-id',
        httpMethod: 'GET',
        identity: {
          sourceIp: '192.0.2.1',
          userAgent: 'user-agent',
          clientCert: {
            clientCertPem: 'CERT_CONTENT',
            subjectDN: 'www.example.com',
            issuerDN: 'Example issuer',
            serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
            validity: {
              notBefore: 'May 28 12:30:02 2019 GMT',
              notAfter: 'Aug  5 09:36:04 2021 GMT',
            },
          },
        },
        path: '/my/path',
        protocol: 'HTTP/1.1',
        requestId: 'id=',
        requestTime: '04/Mar/2020:19:15:17 +0000',
        requestTimeEpoch: 1583349317135,
        resourcePath: '/my/path',
        stage: '$default',
      },
      pathParameters: {},
      stageVariables: {},
      body: null,
      isBase64Encoded: false,
    }

    const processor = getProcessor(event)
    const request = processor.createRequest(event)

    expect(request.method).toEqual('GET')
    expect(request.url).toEqual(
      'https://id.execute-api.us-east-1.amazonaws.com/my/path?parameter1=value1&parameter1=value2&parameter2=value'
    )
    expect(Object.fromEntries(request.headers)).toEqual({
      'content-type': 'application/json',
      header1: 'value1',
      header2: 'value1, value2, value3',
    })
  })

  it('Should return valid Request object from version 2.0 API Gateway event', () => {
    const event: LambdaEvent = {
      version: '2.0',
      routeKey: '$default',
      rawPath: '/my/path',
      rawQueryString: 'parameter1=value1&parameter1=value2&parameter2=value',
      cookies: ['cookie1', 'cookie2'],
      headers: {
        'content-type': 'application/json',
        header1: 'value1',
        header2: 'value1,value2',
      },
      queryStringParameters: {
        parameter1: 'value1,value2',
        parameter2: 'value',
      },
      requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        authentication: null,
        authorizer: {},
        domainName: 'id.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'id',
        http: {
          method: 'POST',
          path: '/my/path',
          protocol: 'HTTP/1.1',
          sourceIp: '192.0.2.1',
          userAgent: 'agent',
        },
        requestId: 'id',
        routeKey: '$default',
        stage: '$default',
        time: '12/Mar/2020:19:03:58 +0000',
        timeEpoch: 1583348638390,
      },
      body: 'Hello from Lambda',
      pathParameters: {
        parameter1: 'value1',
      },
      isBase64Encoded: false,
      stageVariables: {
        stageVariable1: 'value1',
        stageVariable2: 'value2',
      },
    }

    const processor = getProcessor(event)
    const request = processor.createRequest(event)

    expect(request.method).toEqual('POST')
    expect(request.url).toEqual(
      'https://id.execute-api.us-east-1.amazonaws.com/my/path?parameter1=value1&parameter1=value2&parameter2=value'
    )
    expect(Object.fromEntries(request.headers)).toEqual({
      'content-type': 'application/json',
      cookie: 'cookie1; cookie2',
      header1: 'value1',
      header2: 'value1,value2',
    })
  })
})
