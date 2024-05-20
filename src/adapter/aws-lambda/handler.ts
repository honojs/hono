// @denoify-ignore
import crypto from 'crypto'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'

import type {
  ApiGatewayRequestContext,
  ApiGatewayRequestContextV2,
  ALBRequestContext,
} from './custom-context'
import { getProcessor } from './processor'
import type { LambdaContext } from './types'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.crypto ??= crypto

export type LambdaEvent = unknown | LambdaRequestEvent
export type LambdaRequestEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2 | ALBProxyEvent

// When calling API Gateway's HTTP API or Lambda directly through function urls
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

// When calling Lambda through an API Gateway's REST API
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
