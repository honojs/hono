// @denoify-ignore
import crypto from 'crypto'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'

import { encodeBase64 } from '../../utils/encode'
import type { ApiGatewayRequestContext, ApiGatewayRequestContextV2 } from './custom-context'
import type { LambdaContext } from './types'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.crypto ??= crypto

// When calling Lambda directly through function urls
export interface APIGatewayProxyEventV2 {
  httpMethod: string
  headers: Record<string, string | undefined>
  cookies?: string[]
  rawPath: string
  rawQueryString: string
  body: string | null
  isBase64Encoded: boolean
  requestContext: ApiGatewayRequestContextV2
}

// When calling Lambda through an API Gateway or an ELB
export interface APIGatewayProxyEvent {
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
}

interface APIGatewayProxyResult {
  statusCode: number
  body: string
  headers: Record<string, string>
  cookies?: string[]
  multiValueHeaders?: {
    [headerKey: string]: string[]
  }
  isBase64Encoded: boolean
}

const getRequestContext = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2
): ApiGatewayRequestContext | ApiGatewayRequestContextV2 => {
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
    async (
      event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
      responseStream: NodeJS.WritableStream,
      context: LambdaContext
    ) => {
      try {
        const req = createRequest(event)
        const requestContext = getRequestContext(event)

        const res = await app.fetch(req, {
          requestContext,
          context,
        })

        // Check content type
        const httpResponseMetadata = {
          statusCode: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        }

        if (res.body) {
          await streamToNodeStream(
            res.body.getReader(),
            awslambda.HttpResponseStream.from(responseStream, httpResponseMetadata)
          )
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
    event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
    lambdaContext?: LambdaContext
  ): Promise<APIGatewayProxyResult> => {
    const req = createRequest(event)
    const requestContext = getRequestContext(event)

    const res = await app.fetch(req, {
      requestContext,
      lambdaContext,
    })

    return createResult(event, res)
  }
}

const createResult = async (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
  res: Response
): Promise<APIGatewayProxyResult> => {
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

  setCookies(event, res, result)
  res.headers.forEach((value, key) => {
    result.headers[key] = value
  })

  return result
}

const createRequest = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2
) => {
  const queryString = extractQueryString(event)
  const urlPath = `https://${event.requestContext.domainName}${
    isProxyEvent(event) ? event.path : event.rawPath
  }`
  const url = queryString ? `${urlPath}?${queryString}` : urlPath

  const headers = new Headers()
  getCookies(event, headers)
  for (const [k, v] of Object.entries(event.headers)) {
    if (v) headers.set(k, v)
  }

  const method = isProxyEvent(event) ? event.httpMethod : event.requestContext.http.method
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
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2
) => {
  if (isProxyEvent(event)) {
    return Object.entries(event.queryStringParameters || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
  }
  return event.rawQueryString
}

const getCookies = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
  headers: Headers
) => {
  if (isProxyEventV2(event) && Array.isArray(event.cookies)) {
    headers.set('Cookie', event.cookies.join('; '))
  }
}

const setCookies = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
  res: Response,
  result: APIGatewayProxyResult
) => {
  if (res.headers.has('set-cookie')) {
    const cookies = res.headers.get('set-cookie')?.split(', ')
    if (Array.isArray(cookies)) {
      if (isProxyEventV2(event)) {
        result.cookies = cookies
      } else {
        result.multiValueHeaders = {
          'set-cookie': cookies,
        }
      }
      res.headers.delete('set-cookie')
    }
  }
}

const isProxyEvent = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2
): event is APIGatewayProxyEvent => {
  return Object.prototype.hasOwnProperty.call(event, 'path')
}

const isProxyEventV2 = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2
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
