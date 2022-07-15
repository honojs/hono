import type { Context } from '../../context'
import type { Next } from '../../hono'
// Since Node.js v17
// import { CompressionStream } from 'node:stream/web'

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
    await next()
  }
}