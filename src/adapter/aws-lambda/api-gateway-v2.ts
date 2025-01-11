/**
 * @module
 * AWS Lambda Adapter for Hono. Invoked by AWS API Gateway Proxy Event V2.
 */

export { handle, streamHandle } from './handler'
export type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from './handler'
export type { ApiGatewayRequestContext, LambdaContext } from './types'

import type { APIGatewayProxyEventV2 } from './handler'
import type { LambdaContext } from './types'

declare module '../../types' {
  interface DefaultEnv {
    Bindings: DefaultBindings
  }

  interface DefaultBindings {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore On development, this line will raise an error because of interface merging.
    event: APIGatewayProxyEventV2
    lambdaContext: LambdaContext
  }
}
