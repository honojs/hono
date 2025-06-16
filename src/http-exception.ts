/**
 * @module
 * This module provides the `HTTPException` class.
 */

import { createResponse } from './utils/common'
import type { ContentfulStatusCode } from './utils/http-status'

/**
 * Options for creating an `HTTPException`.
 * @property res - Optional response object to use.
 * @property message - Optional custom error message.
 * @property cause - Optional cause of the error.
 */
type HTTPExceptionOptions = {
  res?: Response
  message?: string
  cause?: unknown
}

/**
 * `HTTPException` must be used when a fatal error such as authentication failure occurs.
 *
 * @see {@link https://hono.dev/docs/api/exception}
 *
 * @param {StatusCode} status - status code of HTTPException
 * @param {HTTPExceptionOptions} options - options of HTTPException
 * @param {HTTPExceptionOptions["res"]} options.res - response of options of HTTPException
 * @param {HTTPExceptionOptions["message"]} options.message - message of options of HTTPException
 * @param {HTTPExceptionOptions["cause"]} options.cause - cause of options of HTTPException
 *
 * @example
 * ```ts
 * import { HTTPException } from 'hono/http-exception'
 *
 * // ...
 *
 * app.post('/auth', async (c, next) => {
 *   // authentication
 *   if (authorized === false) {
 *     throw new HTTPException(401, { message: 'Custom error message' })
 *   }
 *   await next()
 * })
 * ```
 */
export class HTTPException extends Error {
  readonly res?: Response
  readonly status: ContentfulStatusCode

  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(status: ContentfulStatusCode = 500, options?: HTTPExceptionOptions) {
    super(options?.message, { cause: options?.cause })
    this.res = options?.res
    this.status = status
  }

  /**
   * Returns the response object associated with the exception.
   * If a response object is not provided, a new response is created with the error message and status code.
   * @returns The response object.
   */
  getResponse(): Response {
    if (this.res) {
      const newResponse = createResponse(this.res.body, {
        status: this.status,
        headers: this.res.headers,
      })
      return newResponse
    }
    return createResponse(this.message, {
      status: this.status,
    })
  }
}
