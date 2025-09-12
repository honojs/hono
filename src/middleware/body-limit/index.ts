/**
 * @module
 * Body Limit Middleware for Hono.
 */

import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'

const ERROR_MESSAGE = 'Payload Too Large'

type OnError = (c: Context) => Response | Promise<Response>
type BodyLimitOptions = {
  maxSize: number
  onError?: OnError
}

class BodyLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BodyLimitError'
  }
}

/**
 * Body Limit Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/body-limit}
 *
 * @param {BodyLimitOptions} options - The options for the body limit middleware.
 * @param {number} options.maxSize - The maximum body size allowed.
 * @param {OnError} [options.onError] - The error handler to be invoked if the specified body size is exceeded.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.post(
 *   '/upload',
 *   bodyLimit({
 *     maxSize: 50 * 1024, // 50kb
 *     onError: (c) => {
 *       return c.text('overflow :(', 413)
 *     },
 *   }),
 *   async (c) => {
 *     const body = await c.req.parseBody()
 *     if (body['file'] instanceof File) {
 *       console.log(`Got file sized: ${body['file'].size}`)
 *     }
 *     return c.text('pass :)')
 *   }
 * )
 * ```
 */
export const bodyLimit = (options: BodyLimitOptions): MiddlewareHandler => {
  const onError: OnError =
    options.onError ||
    (() => {
      const res = new Response(ERROR_MESSAGE, {
        status: 413,
      })
      throw new HTTPException(413, { res })
    })
  const maxSize = options.maxSize

  return async function bodyLimit(c, next) {
    if (!c.req.raw.body) {
      // maybe GET or HEAD request
      return next()
    }

    const hasTransferEncoding = c.req.raw.headers.has('transfer-encoding')
    const hasContentLength = c.req.raw.headers.has('content-length')

    // RFC 7230: If both Transfer-Encoding and Content-Length are present,
    // Transfer-Encoding takes precedence and Content-Length should be ignored
    if (hasTransferEncoding && hasContentLength) {
      // Both headers present - follow RFC 7230 and ignore Content-Length
      // This might indicate request smuggling attempt
    }

    if (hasContentLength && !hasTransferEncoding) {
      // Only Content-Length present - we can trust it
      const contentLength = parseInt(c.req.raw.headers.get('content-length') || '0', 10)
      return contentLength > maxSize ? onError(c) : next()
    }

    // Transfer-Encoding present (chunked) or no length headers

    let size = 0
    const rawReader = c.req.raw.body.getReader()
    const reader = new ReadableStream({
      async start(controller) {
        try {
          for (;;) {
            const { done, value } = await rawReader.read()
            if (done) {
              break
            }
            size += value.length
            if (size > maxSize) {
              controller.error(new BodyLimitError(ERROR_MESSAGE))
              break
            }

            controller.enqueue(value)
          }
        } finally {
          controller.close()
        }
      },
    })

    const requestInit: RequestInit & { duplex: 'half' } = { body: reader, duplex: 'half' }
    c.req.raw = new Request(c.req.raw, requestInit as RequestInit)

    await next()

    if (c.error instanceof BodyLimitError) {
      c.res = await onError(c)
    }
  }
}
