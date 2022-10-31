import type { MiddlewareHandler } from '../../types.ts'

type EncodingType = 'gzip' | 'deflate'

interface CompressionOptions {
  encoding?: EncodingType
}

export const compress = (options?: CompressionOptions): MiddlewareHandler => {
  return async (ctx, next) => {
    await next()
    const accepted = ctx.req.headers.get('Accept-Encoding')
    const pattern = options?.encoding ?? /gzip|deflate/
    const match = accepted?.match(pattern)
    if (!accepted || !match || !ctx.res.body) {
      return
    }
    const encoding = match[0]
    const stream = new CompressionStream(encoding as EncodingType)
    ctx.res = new Response(ctx.res.body.pipeThrough(stream), ctx.res)
    ctx.res.headers.set('Content-Encoding', encoding)
  }
}
