import type {
  ALBRequestContext as ALBRequestContext_,
  ApiGatewayRequestContextV2 as ApiGatewayRequestContextV2_,
  ApiGatewayRequestContext as ApiGatewayRequestContext_,
} from './types'

/**
 * @deprecated Use `ApiGatewayRequestContext` from `@src/adapter/aws-lambda/types` instead.
 */
export type ApiGatewayRequestContext = ApiGatewayRequestContext_

/**
 * @deprecated Use `ApiGatewayRequestContextV2` from `hono/aws-lambda/types` instead.
 */
export type ApiGatewayRequestContextV2 = ApiGatewayRequestContextV2_

/**
 * @deprecated Use `ApiGatewayRequestContext` from `@src/adapter/aws-lambda/types` instead.
 */
export type ALBRequestContext = ALBRequestContext_
