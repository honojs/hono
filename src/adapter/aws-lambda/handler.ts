// @denoify-ignore
import crypto from 'crypto'
import type { Hono } from '../../hono'

import { encodeBase64 } from '../../utils/encode'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.crypto ??= crypto

// When calling Lambda directly through function urls
interface APIGatewayProxyEventV2 {
  httpMethod: string
  headers: Record<string, string | undefined>
  rawPath: string
  rawQueryString: string
  body: string | null
  isBase64Encoded: boolean
  requestContext: {
    domainName: string
  }
}

// When calling Lambda through an API Gateway or an ELB
interface APIGatewayProxyEvent {
  httpMethod: string
  headers: Record<string, string | undefined>
  path: string
  body: string | null
  isBase64Encoded: boolean
  queryStringParameters?: Record<string, string | undefined>
  requestContext: {
    domainName: string
  }
}

// When calling Lambda through an Lambda Function URLs
interface LambdaFunctionUrlEvent {
  headers: Record<string, string | undefined>
  rawPath: string
  rawQueryString: string
  body: string | null
  isBase64Encoded: boolean
  requestContext: {
    domainName: string
    http: {
      method: string
    }
  }
}

interface CloudFrontHeader {
  key: string;
  value: string;
}

interface CloudFrontHeaders {
  [name: string]: CloudFrontHeader[];
}

interface CloudFrontCustomOrigin {
  customHeaders: CloudFrontHeaders;
  domainName: string;
  keepaliveTimeout: number;
  path: string;
  port: number;
  protocol: string;
  readTimeout: number;
  sslProtocols: string[];
}

interface CloudFrontRequest {
  clientIp: string;
  headers: CloudFrontHeaders;
  method: string;
  querystring: string;
  uri: string;
  body?: {
    inputTruncated: boolean;
    action: string;
    encoding: string;
    data: string;
  };
  origin?: {
    custom: CloudFrontCustomOrigin;
  };
}

interface CloudFrontConfig {
  distributionDomainName: string;
  distributionId: string;
  eventType: string;
  requestId: string;
}

interface CloudFrontEvent {
  cf: {
    config: CloudFrontConfig;
    request: CloudFrontRequest;
  };
}

interface CloudFrontEdgeEvent {
  Records: CloudFrontEvent[];
}

interface APIGatewayProxyResult {
  statusCode: number
  body: string
  headers: Record<string, string>
  isBase64Encoded: boolean
}

/**
 * Accepts events from API Gateway/ELB(`APIGatewayProxyEvent`) and directly through Function Url(`APIGatewayProxyEventV2`)
 */
export const handle = (app: Hono) => {
  return async (
    event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent | CloudFrontEdgeEvent
  ): Promise<APIGatewayProxyResult> => {
    const req = createRequest(event)
    const res = await app.fetch(req)

    return createResult(res)
  }
}

const createResult = async (res: Response): Promise<APIGatewayProxyResult> => {
  const contentType = res.headers.get('content-type')
  const isBase64Encoded = contentType && isContentTypeBinary(contentType) ? true : false

  let body: string
  if (isBase64Encoded) {
    const buffer = await res.arrayBuffer()
    body = encodeBase64(buffer)
  } else {
    body = await res.text()
  }
  const result: APIGatewayProxyResult = {
    body: body,
    headers: {},
    statusCode: res.status,
    isBase64Encoded,
  }

  res.headers.forEach((value, key) => {
    result.headers[key] = value
  })

  return result
}

const createRequest = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent | CloudFrontEdgeEvent
) => {
  const queryString = extractQueryString(event)
  const urlPath = `https://${
    isCloudFrontEvent(event)
    ? event.Records[0].cf.config.distributionDomainName
    : event.requestContext.domainName
  }${
    isProxyEvent(event) 
    ? event.path 
    : isCloudFrontEvent(event) 
    ? event.Records[0].cf.request.uri 
    : event.rawPath
  }`

  const url = queryString ? `${urlPath}?${queryString}` : urlPath

  const headers = new Headers()
  if (isCloudFrontEvent(event)) {
    for (const [k, v] of Object.entries(event.Records[0].cf.request.headers)) {
      if (Array.isArray(v)) {
        v.forEach(header => headers.set(k, header.value))
      }
    }
  } else {
    for (const [k, v] of Object.entries(event.headers)) {
      if (v) headers.set(k, v)
    }
  }
  const method = isCloudFrontEvent(event) 
  ? event.Records[0].cf.request.method 
  : 'httpMethod' in event 
    ? event.httpMethod 
    : event.requestContext.http.method
  const requestInit: RequestInit = {
    headers,
    method,
  }

  if (isCloudFrontEvent(event)) {
    const requestBody = event.Records[0].cf.request.body
    requestInit.body = requestBody?.encoding === 'base64' && requestBody?.data
      ? atob(requestBody.data)
      : requestBody?.data
  } else if (event.body) {
    requestInit.body = event.isBase64Encoded ? atob(event.body) : event.body
  }
  
  return new Request(url, requestInit)
}

const extractQueryString = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent | CloudFrontEdgeEvent
) => {
  if (isProxyEvent(event)) {
    return Object.entries(event.queryStringParameters || {})
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v || '')}`)
      .join('&')
  } else if (isProxyEventV2(event)) {
    return event.rawQueryString
  } else if (isCloudFrontEvent(event)) {
    return event.Records[0].cf.request.querystring
  }
  throw new Error('Unsupported event type')
}

const isProxyEvent = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent | CloudFrontEdgeEvent
): event is APIGatewayProxyEvent => {
  return Object.prototype.hasOwnProperty.call(event, 'path')
}

const isProxyEventV2 = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent | CloudFrontEdgeEvent
): event is APIGatewayProxyEventV2 => {
  return Object.prototype.hasOwnProperty.call(event, 'rawPath')
}

const isCloudFrontEvent = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent | CloudFrontEdgeEvent
): event is CloudFrontEdgeEvent => {
  return Object.prototype.hasOwnProperty.call(event, 'Records')
}

export const isContentTypeBinary = (contentType: string) => {
  return !/^(text\/(plain|html|css|javascript|csv).*|application\/(.*json|.*xml).*|image\/svg\+xml)$/.test(
    contentType
  )
}
