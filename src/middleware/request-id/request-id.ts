/**
 * @module
 * Request ID Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'

export type RequestIDVariables = {
  requestID: string
}

export type RequesIDOptions = {
  limitLength?: number
  headerName?: string
  generator?: () => string
}

/**
 * Request ID Middleware for Hono.
 *
 * @param {object} options - Options for Request ID middleware.
 * @param {number} [options.limitLength=255] - The maximum length of request id.
 * If positive truncates the request id at the specified length.
 * @param {string} [options.headerName=X-Request-Id] - The header name used in request id.
 * @param {generator} [options.generator=crypto.randomUUID()] - The request id generation function.
 *
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * type Variables = RequestIDVariables
 * const app = new Hono<{Variables: Variables}>()
 *
 * app.use(requestID())
 * app.get('/', (c) => {
 *   console.log(c.get('requestID')) // Debug
 *   return c.text('Hello World!')
 * })
 * ```
 */
export const requestID = (options?: RequesIDOptions): MiddlewareHandler => {
  const limitLength = options?.limitLength ?? 255
  const headerName = options?.headerName ?? 'X-Request-Id'

  return async function requestID(c, next) {
    let requestId = c.req.header(headerName)
    if (requestId) {
      requestId = requestId.replace(/[^\w\-]/g, '')
      requestId = limitLength > 0 ? requestId.substring(0, limitLength) : requestId
    } else {
      requestId = options?.generator?.() ?? crypto.randomUUID()
    }

    c.set('requestID', requestId)
    if (headerName) {
      c.header(headerName, requestId)
    }
    await next()
  }
}
