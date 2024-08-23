/**
 * @module
 * Compress Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'
import compressible from './compressible'

const ENCODING_TYPES = ['gzip', 'deflate'] as const

interface CompressionOptions {
  encoding?: (typeof ENCODING_TYPES)[number]
  threshold?: number
}

const cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/

/**
 * Compress Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/compress}
 *
 * @param {CompressionOptions} [options] - The options for the compress middleware.
 * @param {'gzip' | 'deflate'} [options.encoding] - The compression scheme to allow for response compression. Either 'gzip' or 'deflate'. If not defined, both are allowed and will be used based on the Accept-Encoding header. 'gzip' is prioritized if this option is not provided and the client provides both in the Accept-Encoding header.
 * @param {number} [options.threshold=1024] - The minimum size in bytes to compress. Defaults to 1024 bytes.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(compress())
 * ```
 */
export const compress = (options?: CompressionOptions): MiddlewareHandler => {
  const threshold = options?.threshold ?? 1024

  return async function compress(ctx, next) {
    await next()

    const res = ctx.res
    const req = ctx.req
    const contentEncoding = res.headers.get('Content-Encoding') || 'identity'
    const contentLength = res.headers.get('Content-Length')

    // Check if response should be compressed
    if (
      contentEncoding !== 'identity' || // already encoded
      (contentLength && Number(contentLength) < threshold) || // content-length below threshold
      !shouldCompress(res) || // not compressible type
      !shouldTransform(res) || // cache-control: no-transform
      req.method === 'HEAD' // HEAD request
    ) {
      return
    }

    const accepted = ctx.req.header('Accept-Encoding')
    const encoding =
      options?.encoding ?? ENCODING_TYPES.find((encoding) => accepted?.includes(encoding))

    if (!encoding || !res.body) {
      return
    }

    // Compress the response
    const stream = new CompressionStream(encoding)
    ctx.res = new Response(res.body.pipeThrough(stream), res)
    ctx.res.headers.delete('Content-Length')
    ctx.res.headers.set('Content-Encoding', encoding)
  }
}

const shouldCompress = (res: Response) => {
  const type = res.headers.get('Content-Type')
  if (!type) {
    return false
  }
  return compressible(type)
}

const shouldTransform = (res: Response) => {
  const cacheControl = res.headers.get('Cache-Control')
  // Don't compress for Cache-Control: no-transform
  // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
  return !cacheControl || !cacheControlNoTransformRegExp.test(cacheControl)
}
