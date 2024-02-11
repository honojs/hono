import type { MiddlewareHandler } from '../../types.ts'

const ENCODING_TYPES = ['gzip', 'deflate'] as const

interface CompressionOptions {
  encoding?: (typeof ENCODING_TYPES)[number]
}

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
