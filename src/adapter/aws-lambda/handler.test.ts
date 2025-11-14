import type { LambdaEvent, LatticeProxyEventV2 } from './handler'
import { getProcessor, isContentEncodingBinary, defaultIsContentTypeBinary } from './handler'

// Base event objects to reduce duplication
const baseV1Event: LambdaEvent = {
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

const baseV2Event: LambdaEvent = {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/my/path',
  rawQueryString: '',
  cookies: [],
  headers: {},
  queryStringParameters: {},
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
  body: null,
  pathParameters: {},
  isBase64Encoded: false,
  stageVariables: {},
}

describe('isContentTypeBinary', () => {
  it.each([
    ['image/png', true],
    ['font/woff2', true],
    ['image/svg+xml', false],
    ['image/svg+xml; charset=UTF-8', false],
    ['text/plain', false],
    ['text/plain; charset=UTF-8', false],
    ['text/css', false],
    ['text/javascript', false],
    ['application/json', false],
    ['application/ld+json', false],
    ['application/json', false],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', true],
    ['application/msword', true],
    ['application/epub+zip', true],
    ['application/ld+json', false],
    ['application/vnd.oasis.opendocument.text', true],
  ])('Should determine whether %s it is binary', (mimeType: string, expected: boolean) => {
    expect(defaultIsContentTypeBinary(mimeType)).toBe(expected)
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

describe('EventProcessor.createResult with contentTypesAsBinary', () => {
  const event = baseV1Event

  it('Should encode as base64 when content-type is in contentTypesAsBinary array', async () => {
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

  it('Should use defaultIsContentTypeBinary when isContentTypeBinary is undefined with binary content', async () => {
    const processor = getProcessor(event)
    const response = new Response('test image content', {
      headers: { 'content-type': 'image/png' },
    })

    // Pass undefined for isContentTypeBinary to test default behavior
    const result = await processor.createResult(event, response, {
      isContentTypeBinary: undefined,
    })

    expect(result.isBase64Encoded).toBe(true)
    expect(result.body).toBe('dGVzdCBpbWFnZSBjb250ZW50')
  })

  it('Should use defaultIsContentTypeBinary when isContentTypeBinary is undefined with non-binary content', async () => {
    const processor = getProcessor(event)
    const response = new Response('test text content', {
      headers: { 'content-type': 'text/plain' },
    })

    // Pass undefined for isContentTypeBinary to test default behavior
    const result = await processor.createResult(event, response, {
      isContentTypeBinary: undefined,
    })

    expect(result.isBase64Encoded).toBe(false)
    expect(result.body).toBe('test text content')
  })
})

describe('EventProcessor.createRequest', () => {
  it('Should preserve percent-encoded values in query string for version 1.0', () => {
    const event: LambdaEvent = {
      ...baseV1Event,
      // API Gateway provides decoded values
      multiValueQueryStringParameters: {
        path: ['/book/{bookId}/'], // Originally %7BbookId%7D
        name: ['John Doe'], // Originally John%20Doe
        tag: ['日本語'], // Originally %E6%97%A5%E6%9C%AC%E8%AA%9E
      },
    }

    const processor = getProcessor(event)
    const request = processor.createRequest(event)

    // URL should contain properly encoded values
    expect(request.url).toEqual(
      'https://id.execute-api.us-east-1.amazonaws.com/my/path?path=%2Fbook%2F%7BbookId%7D%2F&name=John%20Doe&tag=%E6%97%A5%E6%9C%AC%E8%AA%9E'
    )
  })

  it('Should handle special characters correctly in queryStringParameters for version 1.0', () => {
    const event: LambdaEvent = {
      ...baseV1Event,
      queryStringParameters: {
        'key with spaces': 'value with spaces',
        'special!@#$%^&*()': 'chars!@#$%^&*()',
        equals: 'a=b=c',
        ampersand: 'a&b&c',
      },
    }

    const processor = getProcessor(event)
    const request = processor.createRequest(event)

    // Verify the URL is properly encoded
    const url = new URL(request.url)
    expect(url.searchParams.get('key with spaces')).toBe('value with spaces')
    expect(url.searchParams.get('special!@#$%^&*()')).toBe('chars!@#$%^&*()')
    expect(url.searchParams.get('equals')).toBe('a=b=c')
    expect(url.searchParams.get('ampersand')).toBe('a&b&c')
  })

  it('Should return valid Request object from version 1.0 API Gateway event', () => {
    const event: LambdaEvent = {
      ...baseV1Event,
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
    }

    const processor = getProcessor(event)
    const request = processor.createRequest(event)

    expect(request.method).toEqual('GET')
    // Note: Values are now properly encoded
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
      ...baseV2Event,
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
      body: 'Hello from Lambda',
      pathParameters: {
        parameter1: 'value1',
      },
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

  it('Should return valid Request object from version 2.0 Lattice event', async () => {
    const event: LatticeProxyEventV2 = {
      version: '2.0',
      // query string parameters from the path take precedence over the explicit notation below
      path: '/my/path?parameter1=value1&parameter1=value2&parameter2=value',
      method: 'POST',
      headers: {
        cookie: ['cookie1=value1; cookie2=value2'],
        'content-type': ['application/x-www-form-urlencoded'],
        header1: ['value1'],
        header2: ['value1', 'value2'],
        host: ['my-service-a1b2c3.x1y2z3.vpc-lattice-svcs.us-east-1.on.aws'],
      },
      queryStringParameters: {
        parameter1: ['value1', 'value2'],
        parameter2: ['value'],
      },
      body: 'SGVsbG8gZnJvbSBMYW1iZGE=',
      isBase64Encoded: true,
      requestContext: {
        serviceNetworkArn: '',
        serviceArn: '',
        targetGroupArn: '',
        identity: {},
        region: 'us-east-1',
        timeEpoch: '1583348638390123',
      },
    }

    const processor = getProcessor(event)
    const request = processor.createRequest(event)

    expect(await request.text()).toEqual('Hello from Lambda')
    expect(request.method).toEqual('POST')
    expect(request.url).toEqual(
      'https://my-service-a1b2c3.x1y2z3.vpc-lattice-svcs.us-east-1.on.aws/my/path?parameter1=value1&parameter1=value2&parameter2=value'
    )
    expect(Object.fromEntries(request.headers)).toEqual({
      'content-type': 'application/x-www-form-urlencoded',
      cookie: 'cookie1=value1; cookie2=value2',
      header1: 'value1',
      header2: 'value1, value2',
      host: 'my-service-a1b2c3.x1y2z3.vpc-lattice-svcs.us-east-1.on.aws',
    })
  })

  describe('non-ASCII header value processing', () => {
    it('Should encode non-ASCII header values with encodeURIComponent', async () => {
      const event: LambdaEvent = {
        ...baseV1Event,
        headers: {
          'x-city': '炎', // Non-ASCII character
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      const xCity = request.headers.get('x-city') ?? ''
      expect(decodeURIComponent(xCity)).toBe('炎')
    })
  })
})
