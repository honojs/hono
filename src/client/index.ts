/**
 * @module
 * The HTTP Client for Hono.
 */

export { hc } from './client'
export { hcParse, DetailedError } from './utils'
export type {
  InferResponseType,
  InferRequestType,
  Fetch,
  ClientRequestOptions,
  ClientRequest,
  ClientResponse,
} from './types'
