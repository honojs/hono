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

    if (hasContentLength && !hasTransferEncoding) {
      // Only Content-Length present - we can trust it
      const contentLength = parseInt(c.req.raw.headers.get('content-length') || '0', 10)
      return contentLength > maxSize ? onError(c) : next()
    }

    // Transfer-Encoding present (chunked) or no length headers.
    // Per RFC 7230, when both are present Transfer-Encoding takes precedence
    // and Content-Length is ignored. Read the body up-front so the size check
    // is final before the handler runs, regardless of how (or whether) the
    // handler reads the body.
    let size = 0
    const chunks: Uint8Array[] = []
    const rawReader = c.req.raw.body.getReader()
    for (;;) {
      const { done, value } = await rawReader.read()
      if (done) {
        break
      }
      size += value.length
      if (size > maxSize) {
        return onError(c)
      }
      chunks.push(value)
    }

    const requestInit: RequestInit & { duplex: 'half' } = {
      body: new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk)
          }
          controller.close()
        },
      }),
      duplex: 'half',
    }
    c.req.raw = new Request(c.req.raw, requestInit as RequestInit)

    return next()
  }
}
