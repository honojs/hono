/**
 * @module
 * AWS Lambda Adapter for Hono.
 *
 * @deprecated
 * This adapter will be removed from the `hono` package in v5.
 * Install `@hono/aws-lambda` and import from there instead.
 */

export { handle, streamHandle, defaultIsContentTypeBinary } from './handler'
export { getConnInfo } from './conninfo'
export type { APIGatewayProxyResult, LambdaEvent } from './handler'
export type {
  ApiGatewayRequestContext,
  ApiGatewayRequestContextV2,
  ALBRequestContext,
  LambdaContext,
} from './types'
