import type { LambdaEvent, ALBProxyEvent, LatticeProxyEventV2 } from './handler'
import {
  getProcessor,
  isContentEncodingBinary,
  defaultIsContentTypeBinary,
  ALBProcessor,
  EventV1Processor,
  EventV2Processor,
  LatticeV2Processor,
} from './handler'

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

const baseALBEvent: ALBProxyEvent = {
  httpMethod: 'GET',
  path: '/my/path',
  headers: {
    host: 'my-alb-1234567890.us-east-1.elb.amazonaws.com',
  },
  body: null,
  isBase64Encoded: false,
  queryStringParameters: {},
  requestContext: {
    elb: {
      targetGroupArn:
        'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-target-group/50dc6c495c0c9188',
    },
  },
}

const baseLatticeEvent: LatticeProxyEventV2 = {
  version: '2.0',
  path: '/my/path',
  method: 'GET',
  headers: {
    host: ['my-service.us-east-1.on.aws'],
  },
  queryStringParameters: {},
  body: null,
  isBase64Encoded: false,
  requestContext: {
    serviceNetworkArn: 'arn:aws:vpc-lattice:us-east-1:123456789012:servicenetwork/sn-abc123',
    serviceArn: 'arn:aws:vpc-lattice:us-east-1:123456789012:service/svc-abc123',
    targetGroupArn: 'arn:aws:vpc-lattice:us-east-1:123456789012:targetgroup/tg-abc123',
    region: 'us-east-1',
    timeEpoch: '1583348638390123',
    identity: {},
  },
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

    it('Should encode non-ASCII multiValueHeaders values with encodeURIComponent for version 1.0', () => {
      const event: LambdaEvent = {
        ...baseV1Event,
        headers: {},
        multiValueHeaders: {
          'x-city': ['東京', '大阪'],
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      const xCity = request.headers.get('x-city') ?? ''
      // multiValueHeaders are appended, so they are joined with ', '
      const decoded = xCity.split(', ').map(decodeURIComponent)
      expect(decoded).toEqual(['東京', '大阪'])
    })

    it('Should encode non-ASCII header values for ALB events', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        headers: {
          host: 'example.com',
          'x-custom': '日本語テスト',
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      const xCustom = request.headers.get('x-custom') ?? ''
      expect(decodeURIComponent(xCustom)).toBe('日本語テスト')
    })

    it('Should sanitize non-ASCII ALB multiValueHeaders by joining with "; "', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        headers: undefined,
        multiValueHeaders: {
          host: ['example.com'],
          'x-custom': ['café', 'naïve'],
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      const xCustom = request.headers.get('x-custom') ?? ''
      expect(decodeURIComponent(xCustom)).toBe('café; naïve')
    })
  })

  describe('ALBProcessor.createRequest', () => {
    it('Should create a valid Request from ALB event with single-value headers', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        headers: {
          host: 'my-alb.us-east-1.elb.amazonaws.com',
          'content-type': 'application/json',
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(request.method).toBe('GET')
      expect(request.url).toBe('https://my-alb.us-east-1.elb.amazonaws.com/my/path')
      expect(request.headers.get('content-type')).toBe('application/json')
    })

    it('Should create a valid Request from ALB event with multiValueHeaders', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        headers: undefined,
        multiValueHeaders: {
          host: ['my-alb.us-east-1.elb.amazonaws.com'],
          'content-type': ['application/json'],
          'x-custom': ['value1', 'value2'],
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(request.method).toBe('GET')
      expect(request.url).toBe('https://my-alb.us-east-1.elb.amazonaws.com/my/path')
      expect(request.headers.get('content-type')).toBe('application/json')
      // ALB multiValueHeaders are joined with '; ' per RFC 9110
      expect(request.headers.get('x-custom')).toBe('value1; value2')
    })

    it('Should handle ALB queryStringParameters', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        queryStringParameters: {
          key1: 'value1',
          key2: 'value2',
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      const url = new URL(request.url)
      expect(url.searchParams.get('key1')).toBe('value1')
      expect(url.searchParams.get('key2')).toBe('value2')
    })

    it('Should handle ALB multiValueQueryStringParameters', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        multiValueQueryStringParameters: {
          select: ['amount', 'currency'],
          filter: ['active'],
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      const url = new URL(request.url)
      expect(url.searchParams.getAll('select')).toEqual(['amount', 'currency'])
      expect(url.searchParams.getAll('filter')).toEqual(['active'])
    })

    it('Should prioritize multiValueQueryStringParameters over queryStringParameters for ALB', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        // When both are present, multiValueQueryStringParameters should take precedence
        queryStringParameters: {
          select: 'currency',
        },
        multiValueQueryStringParameters: {
          select: ['amount', 'currency'],
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      const url = new URL(request.url)
      expect(url.searchParams.getAll('select')).toEqual(['amount', 'currency'])
    })

    it('Should handle ALB cookies from single-value headers', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        headers: {
          host: 'example.com',
          cookie: 'session=abc123; user=john',
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(request.headers.get('cookie')).toBe('session=abc123; user=john')
    })

    it('Should handle ALB cookies from multiValueHeaders', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        headers: undefined,
        multiValueHeaders: {
          host: ['example.com'],
          cookie: ['session=abc123', 'user=john'],
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(request.headers.get('cookie')).toBe('session=abc123; user=john')
    })

    it('Should handle base64-encoded body for ALB events', async () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        httpMethod: 'POST',
        headers: {
          host: 'example.com',
          'content-type': 'application/octet-stream',
        },
        body: 'SGVsbG8gV29ybGQ=', // "Hello World" in base64
        isBase64Encoded: true,
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      const body = await request.text()
      expect(body).toBe('Hello World')
    })
  })

  describe('base64-encoded body handling', () => {
    it('Should decode base64 body for version 1.0 API Gateway event', async () => {
      const event: LambdaEvent = {
        ...baseV1Event,
        httpMethod: 'POST',
        body: 'SGVsbG8gZnJvbSBMYW1iZGE=', // "Hello from Lambda" in base64
        isBase64Encoded: true,
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(await request.text()).toBe('Hello from Lambda')
    })

    it('Should decode base64 body for version 2.0 API Gateway event', async () => {
      const event: LambdaEvent = {
        ...baseV2Event,
        body: 'SGVsbG8gZnJvbSBMYW1iZGE=', // "Hello from Lambda" in base64
        isBase64Encoded: true,
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(await request.text()).toBe('Hello from Lambda')
    })

    it('Should pass through non-base64 body as-is', async () => {
      const event: LambdaEvent = {
        ...baseV1Event,
        httpMethod: 'POST',
        body: 'plain text body',
        isBase64Encoded: false,
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(await request.text()).toBe('plain text body')
    })
  })

  describe('getDomainName fallback', () => {
    it('Should use domainName from requestContext when available', () => {
      // baseV1Event has requestContext.domainName set
      const processor = getProcessor(baseV1Event)
      const request = processor.createRequest(baseV1Event)

      expect(request.url).toContain('id.execute-api.us-east-1.amazonaws.com')
    })

    it('Should fall back to host header when requestContext has no domainName (ALB)', () => {
      // ALB requestContext only has "elb", no "domainName"
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        headers: {
          host: 'my-custom-domain.example.com',
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(request.url).toContain('my-custom-domain.example.com')
    })

    it('Should fall back to multiValueHeaders host when headers.host is absent (ALB)', () => {
      const event: ALBProxyEvent = {
        ...baseALBEvent,
        headers: undefined,
        multiValueHeaders: {
          host: ['alb-multi-value.example.com'],
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(request.url).toContain('alb-multi-value.example.com')
    })

    it('Should use host header from Lattice event headers', () => {
      const event: LatticeProxyEventV2 = {
        ...baseLatticeEvent,
        headers: {
          host: ['lattice-host.vpc-lattice-svcs.us-east-1.on.aws'],
        },
      }

      const processor = getProcessor(event)
      const request = processor.createRequest(event)

      expect(request.url).toContain('lattice-host.vpc-lattice-svcs.us-east-1.on.aws')
    })
  })
})

describe('getProcessor', () => {
  it('Should return ALBProcessor for ALB events', () => {
    const processor = getProcessor(baseALBEvent)
    expect(processor).toBeInstanceOf(ALBProcessor)
  })

  it('Should return EventV2Processor for API Gateway v2 events', () => {
    const processor = getProcessor(baseV2Event)
    expect(processor).toBeInstanceOf(EventV2Processor)
  })

  it('Should return LatticeV2Processor for Lattice v2 events', () => {
    const processor = getProcessor(baseLatticeEvent)
    expect(processor).toBeInstanceOf(LatticeV2Processor)
  })

  it('Should return EventV1Processor for API Gateway v1 events', () => {
    const processor = getProcessor(baseV1Event)
    expect(processor).toBeInstanceOf(EventV1Processor)
  })
})

describe('EventProcessor.createResult', () => {
  it('Should base64 encode when content-encoding is binary', async () => {
    const processor = getProcessor(baseV1Event)
    const response = new Response('compressed content', {
      headers: {
        'content-type': 'text/plain',
        'content-encoding': 'gzip',
      },
    })

    const result = await processor.createResult(baseV1Event, response, {
      isContentTypeBinary: undefined,
    })

    // Even though content-type is text/plain, gzip encoding should force base64
    expect(result.isBase64Encoded).toBe(true)
  })

  it('Should use headers format for V1 events without multiValueHeaders', async () => {
    // V1 event with empty multiValueHeaders should still use single headers
    const event: LambdaEvent = {
      ...baseV1Event,
      multiValueHeaders: undefined,
    }

    const processor = getProcessor(event)
    const response = new Response('hello', {
      headers: { 'x-custom': 'test-value' },
    })

    const result = await processor.createResult(event, response, {
      isContentTypeBinary: undefined,
    })

    expect(result.headers).toBeDefined()
    expect(result.headers!['x-custom']).toBe('test-value')
    expect(result.multiValueHeaders).toBeUndefined()
  })

  it('Should use multiValueHeaders format for events with multiValueHeaders', async () => {
    const event: LambdaEvent = {
      ...baseV1Event,
      multiValueHeaders: {
        'content-type': ['text/plain'],
      },
    }

    const processor = getProcessor(event)
    const response = new Response('hello', {
      headers: { 'x-custom': 'test-value' },
    })

    const result = await processor.createResult(event, response, {
      isContentTypeBinary: undefined,
    })

    expect(result.multiValueHeaders).toBeDefined()
    expect(result.multiValueHeaders!['x-custom']).toEqual(['test-value'])
    expect(result.headers).toBeUndefined()
  })

  it('Should handle set-cookie for V2 events using cookies array', async () => {
    const processor = getProcessor(baseV2Event)
    const response = new Response('hello')
    response.headers.append('set-cookie', 'session=abc; Path=/')
    response.headers.append('set-cookie', 'token=xyz; Path=/')

    const result = await processor.createResult(baseV2Event, response, {
      isContentTypeBinary: undefined,
    })

    expect(result.cookies).toEqual(['session=abc; Path=/', 'token=xyz; Path=/'])
    // set-cookie should be removed from headers after being moved to cookies
    expect(result.headers!['set-cookie']).toBeUndefined()
  })

  it('Should handle set-cookie for V1 events using multiValueHeaders', async () => {
    const processor = getProcessor(baseV1Event)
    const response = new Response('hello')
    response.headers.append('set-cookie', 'session=abc; Path=/')
    response.headers.append('set-cookie', 'token=xyz; Path=/')

    const result = await processor.createResult(baseV1Event, response, {
      isContentTypeBinary: undefined,
    })

    expect(result.multiValueHeaders).toBeDefined()
    expect(result.multiValueHeaders!['set-cookie']).toEqual([
      'session=abc; Path=/',
      'token=xyz; Path=/',
    ])
  })

  it('Should handle set-cookie for ALB events without multiValueHeaders', async () => {
    const processor = getProcessor(baseALBEvent)
    const response = new Response('hello')
    response.headers.append('set-cookie', 'session=abc; Path=/')
    response.headers.append('set-cookie', 'token=xyz; Path=/')

    const result = await processor.createResult(baseALBEvent, response, {
      isContentTypeBinary: undefined,
    })

    // ALB without multiValueHeaders serializes cookies with ', '
    expect(result.headers!['set-cookie']).toBe('session=abc; Path=/, token=xyz; Path=/')
  })

  it('Should handle set-cookie for ALB events with multiValueHeaders', async () => {
    const event: ALBProxyEvent = {
      ...baseALBEvent,
      headers: undefined,
      multiValueHeaders: {
        host: ['example.com'],
      },
    }

    const processor = getProcessor(event)
    const response = new Response('hello')
    response.headers.append('set-cookie', 'session=abc; Path=/')
    response.headers.append('set-cookie', 'token=xyz; Path=/')

    const result = await processor.createResult(event, response, {
      isContentTypeBinary: undefined,
    })

    expect(result.multiValueHeaders!['set-cookie']).toEqual([
      'session=abc; Path=/',
      'token=xyz; Path=/',
    ])
  })

  it('Should handle response with no body', async () => {
    const processor = getProcessor(baseV1Event)
    const response = new Response(null, { status: 204 })

    const result = await processor.createResult(baseV1Event, response, {
      isContentTypeBinary: undefined,
    })

    expect(result.statusCode).toBe(204)
    expect(result.body).toBe('')
    expect(result.isBase64Encoded).toBe(false)
  })

  it('Should set correct statusCode from response', async () => {
    const processor = getProcessor(baseV2Event)
    const response = new Response('Created', { status: 201 })

    const result = await processor.createResult(baseV2Event, response, {
      isContentTypeBinary: undefined,
    })

    expect(result.statusCode).toBe(201)
  })
})

describe('LatticeV2Processor', () => {
  it('Should always return empty string for getQueryString', () => {
    // Lattice events carry query params in the path itself, getQueryString returns ''
    const event: LatticeProxyEventV2 = {
      ...baseLatticeEvent,
      path: '/my/path?key=value',
      queryStringParameters: {
        key: ['value'],
      },
    }

    const processor = getProcessor(event)
    const request = processor.createRequest(event)

    // The query string comes from the path, not from getQueryString
    expect(request.url).toContain('?key=value')
  })

  it('Should handle set-cookie for Lattice events', async () => {
    const processor = getProcessor(baseLatticeEvent)
    const response = new Response('hello')
    response.headers.append('set-cookie', 'session=abc; Path=/')
    response.headers.append('set-cookie', 'token=xyz; Path=/')

    const result = await processor.createResult(baseLatticeEvent, response, {
      isContentTypeBinary: undefined,
    })

    // Lattice serializes cookies with ', ' into headers
    expect(result.headers!['set-cookie']).toBe('session=abc; Path=/, token=xyz; Path=/')
  })
})
