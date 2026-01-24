import type { Context } from '../../context'
import type { GetConnInfo } from '../../helper/conninfo'
import type {
  ApiGatewayRequestContext,
  ApiGatewayRequestContextV2,
  ALBRequestContext,
} from './types'

type LambdaRequestContext =
  | ApiGatewayRequestContext
  | ApiGatewayRequestContextV2
  | ALBRequestContext

type Env = {
  Bindings: {
    requestContext: LambdaRequestContext
  }
}

/**
 * Get connection information from AWS Lambda
 *
 * Extracts client IP from various Lambda event sources:
 * - API Gateway v1 (REST API): requestContext.identity.sourceIp
 * - API Gateway v2 (HTTP API/Function URLs): requestContext.http.sourceIp
 * - ALB: Falls back to x-forwarded-for header
 *
 * @param c - Context
 * @returns Connection information including remote address
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { handle, getConnInfo } from 'hono/aws-lambda'
 *
 * const app = new Hono()
 *
 * app.get('/', (c) => {
 *   const info = getConnInfo(c)
 *   return c.text(`Your IP: ${info.remote.address}`)
 * })
 *
 * export const handler = handle(app)
 * ```
 */
export const getConnInfo: GetConnInfo = (c: Context<Env>) => {
  const requestContext = c.env.requestContext

  let address: string | undefined

  // API Gateway v1 - has identity object
  if ('identity' in requestContext && requestContext.identity?.sourceIp) {
    address = requestContext.identity.sourceIp
  }
  // API Gateway v2 - has http object
  else if ('http' in requestContext && requestContext.http?.sourceIp) {
    address = requestContext.http.sourceIp
  }
  // ALB - use X-Forwarded-For header
  else {
    const xff = c.req.header('x-forwarded-for')
    if (xff) {
      // First IP is the client
      address = xff.split(',')[0].trim()
    }
  }

  return {
    remote: {
      address,
    },
  }
}
