/**
 * @module
 * Lambda@Edge Adapter for Hono.
 */

export { handle } from './handler'
export type {
  Callback,
  CloudFrontConfig,
  CloudFrontRequest,
  CloudFrontResponse,
  CloudFrontEdgeEvent,
} from './handler'
