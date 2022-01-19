import type { Context } from '../context'

export const defaultMiddleware = async (c: Context, next: Function) => {
  c.req.query = (key: string) => {
    // eslint-disable-next-line
    const url = new URL(c.req.url)
    return url.searchParams.get(key)
  }

  await next()

  if (c.res.body) {
    // Do not clone Response, ex: c.res.clone().arrayBuffer()
    const buff = await c.res.arrayBuffer()
    c.res.headers.append('Content-Length', buff.byteLength.toString())
  }
}
