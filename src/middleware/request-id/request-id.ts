/**
 * @module
 * Request ID Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'

export type RequestIdVariables = {
  requestId: string
}

export type RequesIdOptions = {
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
 * type Variables = RequestIdVariables
 * const app = new Hono<{Variables: Variables}>()
 *
 * app.use(requestId())
 * app.get('/', (c) => {
 *   console.log(c.get('requestId')) // Debug
 *   return c.text('Hello World!')
 * })
 * ```
 */
export const requestId = (options?: RequesIdOptions): MiddlewareHandler => {
  const limitLength = options?.limitLength ?? 255
  const headerName = options?.headerName ?? 'X-Request-Id'

  return async function requestId(c, next) {
    // If `headerName` is empty string, req.header will return the object
    let reqId = headerName ? c.req.header(headerName) : undefined

    if (reqId) {
      reqId = reqId.replace(/[^\w\-]/g, '')
      reqId = limitLength > 0 ? reqId.substring(0, limitLength) : reqId
    } else {
      reqId = options?.generator?.() ?? crypto.randomUUID()
    }

    c.set('requestId', reqId)
    if (headerName) {
      c.header(headerName, reqId)
    }
    await next()
  }
}
