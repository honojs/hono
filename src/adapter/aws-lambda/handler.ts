// @denoify-ignore
import crypto from 'crypto'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'

import { encodeBase64 } from '../../utils/encode'
import type { ApiGatewayRequestContext, LambdaFunctionUrlRequestContext } from './custom-context'
import type { LambdaContext } from './types'

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
  requestContext: ApiGatewayRequestContext
}

// When calling Lambda through an API Gateway or an ELB
interface APIGatewayProxyEvent {
  httpMethod: string
  headers: Record<string, string | undefined>
  path: string
  body: string | null
  isBase64Encoded: boolean
  queryStringParameters?: Record<string, string | undefined>
  requestContext: ApiGatewayRequestContext
}

// When calling Lambda through an Lambda Function URLs
interface LambdaFunctionUrlEvent {
  headers: Record<string, string | undefined>
  rawPath: string
  rawQueryString: string
  body: string | null
  isBase64Encoded: boolean
  requestContext: LambdaFunctionUrlRequestContext
}

interface APIGatewayProxyResult {
  statusCode: number
  body: string
  headers: Record<string, string>
  isBase64Encoded: boolean
}

const getRequestContext = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent
): ApiGatewayRequestContext | LambdaFunctionUrlRequestContext => {
  return event.requestContext
}

export const streamHandle = <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>
) => {
  return awslambda.streamifyResponse(
    async (event: APIGatewayProxyEvent, responseStream, context: Context) => {
      try {
        const req = createRequest(event)
        const requestContext = getRequestContext(event)

        const res = await app.fetch(req, {
          requestContext,
          context,
        })

        // Improved content type handling
        const contentType = res.headers.get('content-type')
        if (contentType) {
          responseStream.setContentType(contentType)
        } else {
          console.warn('Content Type is not set in the response.')
          responseStream.setContentType('application/octet-stream')
        }

        // Improved headers handling
        res.headers.forEach((value, name) => {
          responseStream.setHeader(name, value)
        })

        // Use async iterators for more concise code
        if (res.body) {
          for await (const chunk of res.body) {
            responseStream.write(chunk)
          }
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
    event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent,
    lambdaContext?: LambdaContext
  ): Promise<APIGatewayProxyResult> => {
    const req = createRequest(event)
    const requestContext = getRequestContext(event)

    const res = await app.fetch(req, {
      requestContext,
      lambdaContext,
    })

    return createResult(res)
  }
}

const createResult = async (res: Response): Promise<APIGatewayProxyResult> => {
  const contentType = res.headers.get('content-type')
  let isBase64Encoded = contentType && isContentTypeBinary(contentType) ? true : false

  if (!isBase64Encoded) {
    const contentEncoding = res.headers.get('content-encoding')
    isBase64Encoded = isContentEncodingBinary(contentEncoding)
  }

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
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent
) => {
  const queryString = extractQueryString(event)
  const urlPath = `https://${event.requestContext.domainName}${
    isProxyEvent(event) ? event.path : event.rawPath
  }`
  const url = queryString ? `${urlPath}?${queryString}` : urlPath

  const headers = new Headers()
  for (const [k, v] of Object.entries(event.headers)) {
    if (v) headers.set(k, v)
  }

  const method = 'httpMethod' in event ? event.httpMethod : event.requestContext.http.method
  const requestInit: RequestInit = {
    headers,
    method,
  }

  if (event.body) {
    requestInit.body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body
  }

  return new Request(url, requestInit)
}

const extractQueryString = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent
) => {
  if (isProxyEvent(event)) {
    return Object.entries(event.queryStringParameters || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
  }

  return isProxyEventV2(event) ? event.rawQueryString : event.rawQueryString
}

const isProxyEvent = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent
): event is APIGatewayProxyEvent => {
  return Object.prototype.hasOwnProperty.call(event, 'path')
}

const isProxyEventV2 = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent
): event is APIGatewayProxyEventV2 => {
  return Object.prototype.hasOwnProperty.call(event, 'rawPath')
}

export const isContentTypeBinary = (contentType: string) => {
  return !/^(text\/(plain|html|css|javascript|csv).*|application\/(.*json|.*xml).*|image\/svg\+xml)$/.test(
    contentType
  )
}

export const isContentEncodingBinary = (contentEncoding: string | null) => {
  if (contentEncoding === null) {
    return false
  }
  return /^(gzip|deflate|compress|br)/.test(contentEncoding)
}
