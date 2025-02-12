/**
 * @module
 * AWS Lambda Adapter for Hono.
 */
import crypto from 'node:crypto'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.crypto ??= crypto

export { handle, streamHandle } from './handler'
export type { APIGatewayProxyResult, LambdaEvent } from './handler'
export type {
  ApiGatewayRequestContext,
  ApiGatewayRequestContextV2,
  ALBRequestContext,
  LambdaContext,
} from './types'
