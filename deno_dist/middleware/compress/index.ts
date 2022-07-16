import type { Context } from '../../context.ts'
import type { Next } from '../../hono.ts'

interface CompressionOptions {
    encoding?: 'gzip' | 'deflate'
}

export const compress = (options?: CompressionOptions) => {
  return async (ctx: Context, next: Next) => {
    await next()
    const accepted = ctx.req.headers.get('Accept-Encoding')
    const pattern = options?.encoding ?? /gzip|deflate/
    const match = accepted?.match(pattern)
    if (!accepted || !match || !ctx.res.body) {
        return
    }
    const encoding = match[0]
    const stream = new CompressionStream(encoding)
    ctx.res = new Response(ctx.res.body.pipeThrough(stream), ctx.res.clone())
    ctx.res.headers.set('Content-Encoding', encoding)
  }
}