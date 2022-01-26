import type { Context } from '../context'

export const defaultMiddleware = async (c: Context, next: Function) => {
  c.req.query = (key: string) => {
    // eslint-disable-next-line
    const url = new URL(c.req.url)
    return url.searchParams.get(key)
  }
  c.req.header = (name: string): string => {
    return c.req.headers.get(name)
  }

  await next()

  if (c.res.body) {
    // Do not clone Response, ex: c.res.clone().arrayBuffer()
    const buffer = await c.res.arrayBuffer()
    const res = new Response(buffer, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers: c.res.headers,
    })
    res.headers.append('Content-Length', buffer.byteLength.toString())
    c.res = res
  }
}
