/**
 * @module
 * The HTTP Client for Hono.
 */

export { hc, hcx } from './client'
export { parseResponse, DetailedError } from './utils'
export type {
  ClientX,
  InferResponseType,
  InferRequestType,
  Fetch,
  ClientRequestOptions,
  ClientRequest,
  ClientResponse,
  ApplyGlobalResponse,
  PickResponseByStatusCode,
} from './types'
