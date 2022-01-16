import type { Context } from '../context'

export const defaultMiddleware = async (c: Context, next: Function) => {
  c.req.query = (key: string) => {
    // eslint-disable-next-line
    const url = new URL(c.req.url)
    return url.searchParams.get(key)
  }

  await next()

  if (c.res.body) {
    const buff = await c.res.clone().arrayBuffer()
    c.res.headers.append('Content-Length', buff.byteLength.toString())
  }
}
