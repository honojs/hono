// @denoify-ignore
import crypto from 'crypto'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'

import { encodeBase64 } from '../../utils/encode'
import type {
  ApiGatewayRequestContext,
  ApiGatewayRequestContextV2,
  ALBRequestContext,
} from './custom-context'
import type { LambdaContext } from './types'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.crypto ??= crypto

export type LambdaEvent = unknown | LambdaRequestEvent
export type LambdaRequestEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2 | ALBProxyEvent

// When calling HTTP API or Lambda directly through function urls
export interface APIGatewayProxyEventV2 {
  version: string
  routeKey: string
  headers: Record<string, string | undefined>
  multiValueHeaders?: undefined
  cookies?: string[]
  rawPath: string
  rawQueryString: string
  body: string | null
  isBase64Encoded: boolean
  requestContext: ApiGatewayRequestContextV2
  queryStringParameters?: {
    [name: string]: string | undefined
  }
  pathParameters?: {
    [name: string]: string | undefined
  }
  stageVariables?: {
    [name: string]: string | undefined
  }
}

// When calling Lambda through an API Gateway
export interface APIGatewayProxyEvent {
  version: string
  httpMethod: string
  headers: Record<string, string | undefined>
  multiValueHeaders?: {
    [headerKey: string]: string[]
  }
  path: string
  body: string | null
  isBase64Encoded: boolean
  queryStringParameters?: Record<string, string | undefined>
  requestContext: ApiGatewayRequestContext
  resource: string
  multiValueQueryStringParameters?: {
    [parameterKey: string]: string[]
  }
  pathParameters?: Record<string, string>
  stageVariables?: Record<string, string>
}

// When calling Lambda through an Application Load Balancer
export interface ALBProxyEvent {
  httpMethod: string
  headers?: Record<string, string | undefined>
  multiValueHeaders?: Record<string, string[] | undefined>
  path: string
  body: string | null
  isBase64Encoded: boolean
  queryStringParameters?: Record<string, string | undefined>
  requestContext: ALBRequestContext
}

export interface APIGatewayProxyResult {
  statusCode: number
  statusDescription?: string
  body: string
  headers: Record<string, string>
  cookies?: string[]
  multiValueHeaders?: {
    [headerKey: string]: string[]
  }
  isBase64Encoded: boolean
}

const getRequestContext = (
  event: LambdaRequestEvent
): ApiGatewayRequestContext | ApiGatewayRequestContextV2 | ALBRequestContext => {
  return event.requestContext
}

const streamToNodeStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  writer: NodeJS.WritableStream
) => {
  let readResult = await reader.read()
  while (!readResult.done) {
    writer.write(readResult.value)
    readResult = await reader.read()
  }
  writer.end()
}

export const streamHandle = <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>
) => {
  return awslambda.streamifyResponse(
    async (event: LambdaEvent, responseStream: NodeJS.WritableStream, context: LambdaContext) => {
      const processor = getProcessor(event)
      try {
        const req = processor.createRequest(event)
        const requestContext = Object.prototype.hasOwnProperty.call(event, 'requestContext')
          ? getRequestContext(event as LambdaRequestEvent)
          : undefined

        const res = await app.fetch(req, {
          event,
          requestContext,
          context,
        })

        // Check content type
        const httpResponseMetadata = {
          statusCode: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        }

        // Update response stream
        responseStream = awslambda.HttpResponseStream.from(responseStream, httpResponseMetadata)

        if (res.body) {
          await streamToNodeStream(res.body.getReader(), responseStream)
        } else {
          responseStream.write('')
        }
      } catch (error) {
        console.error('Error processing request:', error)
        responseStream.write('Internal Server Error')
      } finally {
        responseStream.end()
      }
    }
  )
}

/**
 * Accepts events from API Gateway/ELB(`APIGatewayProxyEvent`) and directly through Function Url(`APIGatewayProxyEventV2`)
 */
export const handle = <E extends Env = Env, S extends Schema = {}, BasePath extends string = '/'>(
  app: Hono<E, S, BasePath>
) => {
  return async (
    event: LambdaEvent,
    lambdaContext?: LambdaContext
  ): Promise<APIGatewayProxyResult> => {
    const processor = getProcessor(event)

    const req = processor.createRequest(event)
    const requestContext = Object.prototype.hasOwnProperty.call(event, 'requestContext')
      ? getRequestContext(event as LambdaRequestEvent)
      : undefined

    const res = await app.fetch(req, {
      event,
      requestContext,
      lambdaContext,
    })

    return processor.createResult(event, res)
  }
}

abstract class EventProcessor<E extends LambdaEvent> {
  abstract createRequest(event: E): Request

  abstract createResult(event: E, res: Response): Promise<any>
}

abstract class RequestEventProcessor<E extends LambdaRequestEvent> extends EventProcessor<E> {
  protected abstract getPath(event: E): string

  protected abstract getMethod(event: E): string

  protected abstract getQueryString(event: E): string

  protected abstract getHeaders(event: E): Headers

  protected abstract getCookies(event: E, headers: Headers): void

  protected abstract setCookiesToResult(
    event: E,
    result: APIGatewayProxyResult,
    cookies: string[]
  ): void

  createRequest(event: E): Request {
    const queryString = this.getQueryString(event)
    const domainName =
      event.requestContext && 'domainName' in event.requestContext
        ? event.requestContext.domainName
        : event.headers?.host ?? event.multiValueHeaders?.host?.[0]
    const path = this.getPath(event)
    const urlPath = `https://${domainName}${path}`
    const url = queryString ? `${urlPath}?${queryString}` : urlPath

    const headers = this.getHeaders(event)

    const method = this.getMethod(event)
    const requestInit: RequestInit = {
      headers,
      method,
    }

    if (event.body) {
      requestInit.body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body
    }

    return new Request(url, requestInit)
  }

  async createResult(event: E, res: Response): Promise<APIGatewayProxyResult> {
    const contentType = res.headers.get('content-type')
    let isBase64Encoded = !!(contentType && isContentTypeBinary(contentType))

    if (!isBase64Encoded) {
      const contentEncoding = res.headers.get('content-encoding')
      isBase64Encoded = isContentEncodingBinary(contentEncoding)
    }

    const body = isBase64Encoded ? encodeBase64(await res.arrayBuffer()) : await res.text()

    const result: APIGatewayProxyResult = {
      body,
      headers: {},
      multiValueHeaders: event.multiValueHeaders ? {} : undefined,
      statusCode: res.status,
      isBase64Encoded,
    }

    this.setCookies(event, res, result)
    res.headers.forEach((value, key) => {
      result.headers[key] = value
      if (event.multiValueHeaders && result.multiValueHeaders) {
        result.multiValueHeaders[key] = [value]
      }
    })

    return result
  }

  setCookies(event: E, res: Response, result: APIGatewayProxyResult) {
    if (res.headers.has('set-cookie')) {
      const cookies = res.headers.get('set-cookie')?.split(', ')
      if (Array.isArray(cookies)) {
        this.setCookiesToResult(event, result, cookies)
        res.headers.delete('set-cookie')
      }
    }
  }
}

const v2Processor =
  new (class EventV2Processor extends RequestEventProcessor<APIGatewayProxyEventV2> {
    protected getPath(event: APIGatewayProxyEventV2): string {
      return event.rawPath
    }

    protected getMethod(event: APIGatewayProxyEventV2): string {
      return event.requestContext.http.method
    }

    protected getQueryString(event: APIGatewayProxyEventV2): string {
      return event.rawQueryString
    }

    protected getCookies(event: APIGatewayProxyEventV2, headers: Headers): void {
      if (Array.isArray(event.cookies)) {
        headers.set('Cookie', event.cookies.join('; '))
      }
    }

    protected setCookiesToResult(
      _: APIGatewayProxyEventV2,
      result: APIGatewayProxyResult,
      cookies: string[]
    ): void {
      result.cookies = cookies
    }

    protected getHeaders(event: APIGatewayProxyEventV2): Headers {
      const headers = new Headers()
      this.getCookies(event, headers)
      if (event.headers) {
        for (const [k, v] of Object.entries(event.headers)) {
          if (v) {
            headers.set(k, v)
          }
        }
      }
      return headers
    }
  })()

const v1Processor = new (class EventV1Processor extends RequestEventProcessor<
  Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>
> {
  protected getPath(event: Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>): string {
    return event.path
  }

  protected getMethod(event: Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>): string {
    return event.httpMethod
  }

  protected getQueryString(event: Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>): string {
    return Object.entries(event.queryStringParameters || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
  }

  protected getCookies(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    event: Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    headers: Headers
  ): void {
    // nop
  }

  protected getHeaders(event: APIGatewayProxyEvent): Headers {
    const headers = new Headers()
    this.getCookies(event, headers)
    if (event.headers) {
      for (const [k, v] of Object.entries(event.headers)) {
        if (v) {
          headers.set(k, v)
        }
      }
    }
    if (event.multiValueHeaders) {
      for (const [k, values] of Object.entries(event.multiValueHeaders)) {
        if (values) {
          // avoid duplicating already set headers
          const foundK = headers.get(k)
          values.forEach((v) => (!foundK || !foundK.includes(v)) && headers.append(k, v))
        }
      }
    }
    return headers
  }

  protected setCookiesToResult(
    _: APIGatewayProxyEvent,
    result: APIGatewayProxyResult,
    cookies: string[]
  ): void {
    result.multiValueHeaders = {
      'set-cookie': cookies,
    }
  }
})()

const albProcessor = new (class ALBProcessor extends RequestEventProcessor<ALBProxyEvent> {
  protected getHeaders(event: ALBProxyEvent): Headers {
    const headers = new Headers()
    // if multiValueHeaders is present the ALB will use it instead of the headers field
    // https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html#multi-value-headers
    if (event.multiValueHeaders) {
      for (const [key, values] of Object.entries(event.multiValueHeaders)) {
        if (values && Array.isArray(values)) {
          // https://www.rfc-editor.org/rfc/rfc9110.html#name-common-rules-for-defining-f
          headers.set(key, values.join('; '))
        }
      }
    } else {
      for (const [key, value] of Object.entries(event.headers ?? {})) {
        if (value) {
          headers.set(key, value)
        }
      }
    }
    return headers
  }
  protected setHeadersToResult(
    event: ALBProxyEvent,
    result: APIGatewayProxyResult,
    headers: Headers
  ): void {
    // When multiValueHeaders is present in event set multiValueHeaders in result
    if (event.multiValueHeaders) {
      const multiValueHeaders: { [key: string]: string[] } = {}
      for (const [key, value] of headers.entries()) {
        multiValueHeaders[key] = [value]
      }
      result.multiValueHeaders = multiValueHeaders
    } else {
      const singleValueHeaders: Record<string, string> = {}
      for (const [key, value] of headers.entries()) {
        singleValueHeaders[key] = value
      }
      result.headers = singleValueHeaders
    }
  }
  protected getPath(event: ALBProxyEvent): string {
    return event.path
  }

  protected getMethod(event: ALBProxyEvent): string {
    return event.httpMethod
  }

  protected getQueryString(event: ALBProxyEvent): string {
    return Object.entries(event.queryStringParameters || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
  }

  protected getCookies(event: ALBProxyEvent, headers: Headers): void {
    let cookie
    if (event.multiValueHeaders) {
      cookie = event.multiValueHeaders['cookie']?.join('; ')
    } else {
      cookie = event.headers ? event.headers['cookie'] : undefined
    }
    if (cookie) {
      headers.append('Cookie', cookie)
    }
  }

  protected setCookiesToResult(
    event: ALBProxyEvent,
    result: APIGatewayProxyResult,
    cookies: string[]
  ): void {
    // when multi value headers is enabled
    if (event.multiValueHeaders && result.multiValueHeaders) {
      result.multiValueHeaders['set-cookie'] = cookies
    } else {
      // otherwise serialize the set-cookie
      result.headers['set-cookie'] = cookies.join(', ')
    }
  }
})()

export const getProcessor = (event: LambdaEvent): EventProcessor<LambdaEvent> => {
  if (isProxyEventALB(event)) {
    return albProcessor
  }
  if (isProxyEventV2(event)) {
    return v2Processor
  }
  return v1Processor
}

const isProxyEventALB = (event: LambdaEvent): event is ALBProxyEvent => {
  return (
    Object.prototype.hasOwnProperty.call(event, 'requestContext') &&
    Object.prototype.hasOwnProperty.call((event as LambdaRequestEvent).requestContext, 'elb')
  )
}

const isProxyEventV2 = (event: LambdaEvent): event is APIGatewayProxyEventV2 => {
  return Object.prototype.hasOwnProperty.call(event, 'rawPath')
}

export const isContentTypeBinary = (contentType: string) => {
  return !/^(text\/(plain|html|css|javascript|csv).*|application\/(.*json|.*xml).*|image\/svg\+xml.*)$/.test(
    contentType
  )
}

export const isContentEncodingBinary = (contentEncoding: string | null) => {
  if (contentEncoding === null) {
    return false
  }
  return /^(gzip|deflate|compress|br)/.test(contentEncoding)
}
