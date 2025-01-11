/**
 * @module
 * AWS Lambda Adapter for Hono. Invoked by ALB Event.
 */

export { handle, streamHandle } from './handler'
export type { APIGatewayProxyResult, ALBProxyEvent } from './handler'
export type { ALBRequestContext, LambdaContext } from './types'

import type { ALBProxyEvent } from './handler'
import type { LambdaContext } from './types'

declare module '../../types' {
  interface DefaultEnv {
    Bindings: DefaultBindings
  }

  interface DefaultBindings {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore On development, this line will raise an error because of interface merging.
    event: ALBProxyEvent
    lambdaContext: LambdaContext
  }
}
