import type { MiddlewareHandler } from '../../types'

export const contentLength = (): MiddlewareHandler => {
  return async (c, next) => {
    await next()
    const res = new Response(c.res.clone().body)
    const data = await res.arrayBuffer()
    const length = data.byteLength
    c.res.headers.set('Content-Length', length.toString())
  }
}
