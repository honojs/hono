/**
 * @module
 * AWS Lambda Adapter for Hono.
 */

export { handle, streamHandle } from './handler'
export type { APIGatewayProxyResult, LambdaEvent } from './handler'
export type {
  ApiGatewayRequestContext,
  ApiGatewayRequestContextV2,
  ALBRequestContext,
  LambdaContext,
} from './types'
