/**
 * @module
 * Lambda@Edge Adapter for Hono.
 *
 * @deprecated
 * This adapter will be removed from the `hono` package in v5.
 * Install `@hono/lambda-edge` and import from there instead.
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
