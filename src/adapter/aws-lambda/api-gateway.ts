/**
 * @module
 * AWS Lambda Adapter for Hono. Invoked by AWS API Gateway Proxy Event.
 */

export { handle, streamHandle } from './handler'
export type { APIGatewayProxyResult, APIGatewayProxyEvent } from './handler'
export type { ApiGatewayRequestContextV2, LambdaContext } from './types'

import type { APIGatewayProxyEvent } from './handler'
import type { LambdaContext } from './types'

declare module '../../types' {
  interface DefaultEnv {
    Bindings: DefaultBindings
  }

  interface DefaultBindings {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore On development, this line will raise an error because of interface merging.
    event: APIGatewayProxyEvent
    lambdaContext: LambdaContext
  }
}
