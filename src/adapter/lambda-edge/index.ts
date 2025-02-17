/**
 * @module
 * Lambda@Edge Adapter for Hono.
 */

export { handle } from './handler'
export { getConnInfo } from './conninfo'
export type {
  Callback,
  CloudFrontConfig,
  CloudFrontRequest,
  CloudFrontResponse,
  CloudFrontEdgeEvent,
} from './handler'

import type {
  Callback,
  CloudFrontConfig,
  CloudFrontRequest,
  CloudFrontResponse,
  CloudFrontEdgeEvent,
} from './handler'

declare module '../../types' {
  interface DefaultEnv {
    Bindings: DefaultBindings
  }

  interface DefaultBindings {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore On development, this line will raise an error because of interface merging.
    event: CloudFrontEdgeEvent
    context?: {}
    callback: Callback
    config: CloudFrontConfig
    request: CloudFrontRequest
    response?: CloudFrontResponse
  }
}
