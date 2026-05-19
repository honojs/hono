/**
 * @module
 * Compress Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'
import { COMPRESSIBLE_CONTENT_TYPE_REGEX } from '../../utils/compress'

const ENCODING_TYPES = ['gzip', 'deflate'] as const
const cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/i

interface CompressionOptions {
  encoding?: (typeof ENCODING_TYPES)[number]
  threshold?: number
  /**
   * A custom function to determine whether a response should be compressed.
   * When provided, it replaces the default content-type check.
   * Receives the response object; return `true` to compress, `false` to skip.
   */
  shouldCompress?: (res: Response) => boolean
}

/**
 * Compress Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/compress}
 *
 * @param {CompressionOptions} [options] - The options for the compress middleware.
 * @param {'gzip' | 'deflate'} [options.encoding] - The compression scheme to allow for response compression. Either 'gzip' or 'deflate'. If not defined, both are allowed and will be used based on the Accept-Encoding header. 'gzip' is prioritized if this option is not provided and the client provides both in the Accept-Encoding header.
 * @param {number} [options.threshold=1024] - The minimum size in bytes to compress. Defaults to 1024 bytes.
 * @param {Function} [options.shouldCompress] - A custom function to determine whether a response should be compressed. When provided, replaces the built-in content-type check. Return `true` to compress, `false` to skip.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(compress())
 * ```
 *
 * @example
 * ```ts
 * // Compress custom content types in addition to the defaults
 * app.use(compress({
 *   shouldCompress: (res) => {
 *     const type = res.headers.get('Content-Type') ?? ''
 *     return COMPRESSIBLE_CONTENT_TYPE_REGEX.test(type) || type.startsWith('application/vnd.msgpack')
 *   }
 * }))
 * ```
 */
export const compress = (options?: CompressionOptions): MiddlewareHandler => {
  const threshold = options?.threshold ?? 1024
  const compressCheck = options?.shouldCompress ?? defaultShouldCompress

  return async function compress(ctx, next) {
    await next()

    const contentLength = ctx.res.headers.get('Content-Length')

    // Check if response should be compressed
    if (
      ctx.res.headers.has('Content-Encoding') || // already encoded
      ctx.res.headers.has('Transfer-Encoding') || // already encoded or chunked
      ctx.req.method === 'HEAD' || // HEAD request
      (contentLength && Number(contentLength) < threshold) || // content-length below threshold
      !compressCheck(ctx.res) || // not compressible type
      !shouldTransform(ctx.res) // cache-control: no-transform
    ) {
      return
    }

    const accepted = ctx.req.header('Accept-Encoding')
    const encoding =
      options?.encoding ?? ENCODING_TYPES.find((encoding) => accepted?.includes(encoding))
    if (!encoding || !ctx.res.body) {
      return
    }

    // Compress the response
    const stream = new CompressionStream(encoding)
    ctx.res = new Response(ctx.res.body.pipeThrough(stream), ctx.res)
    ctx.res.headers.delete('Content-Length')
    ctx.res.headers.set('Content-Encoding', encoding)
  }
}

export { COMPRESSIBLE_CONTENT_TYPE_REGEX }

const defaultShouldCompress = (res: Response) => {
  const type = res.headers.get('Content-Type')
  return type ? COMPRESSIBLE_CONTENT_TYPE_REGEX.test(type) : false
}

const shouldTransform = (res: Response) => {
  const cacheControl = res.headers.get('Cache-Control')
  // Don't compress for Cache-Control: no-transform
  // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
  return !cacheControl || !cacheControlNoTransformRegExp.test(cacheControl)
}
