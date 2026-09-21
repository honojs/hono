/**
 * @module
 * The HTTP Client for Hono.
 */

export { hc } from './client'
export { parseResponse, parseResponseWithError, DetailedError } from './utils'
export type {
  InferResponseType,
  InferRequestType,
  Fetch,
  ClientRequestOptions,
  ClientRequest,
  ClientResponse,
  ApplyGlobalResponse,
  PickResponseByStatusCode,
} from './types'
