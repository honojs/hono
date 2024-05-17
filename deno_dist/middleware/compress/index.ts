import type { MiddlewareHandler } from '../../types.ts'

const ENCODING_TYPES = ['gzip', 'deflate'] as const

interface CompressionOptions {
  encoding?: (typeof ENCODING_TYPES)[number]
}

/**
 * Compress middleware for Hono.
 *
 * @see {@link https://hono.dev/middleware/builtin/compress}
 *
 * @param {CompressionOptions} [options] - The options for the compress middleware.
 * @param {'gzip' | 'deflate'} [options.encoding] - The compression scheme to allow for response compression. Either 'gzip' or 'deflate'. If not defined, both are allowed and will be used based on the Accept-Encoding header. 'gzip' is prioritized if this option is not provided and the client provides both in the Accept-Encoding header.
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
  return async function compress(ctx, next) {
    await next()
    const accepted = ctx.req.header('Accept-Encoding')
    const encoding =
      options?.encoding ?? ENCODING_TYPES.find((encoding) => accepted?.includes(encoding))
    if (!encoding || !ctx.res.body) {
      return
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const stream = new CompressionStream(encoding)
    ctx.res = new Response(ctx.res.body.pipeThrough(stream), ctx.res)
    ctx.res.headers.delete('Content-Length')
    ctx.res.headers.set('Content-Encoding', encoding)
  }
}
