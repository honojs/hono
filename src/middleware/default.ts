import type { Context } from '../context'

export const defaultMiddleware = async (c: Context, next: Function) => {
  c.req.query = (key: string) => {
    // eslint-disable-next-line
    const url = new URL(c.req.url)
    return url.searchParams.get(key)
  }

  await next()

  /*
  TODO:
  Adding Content-Length header make it more slower.
  This should not be default middleware...
  if (c.res.body) {
    // Do not clone Response, ex: c.res.clone().arrayBuffer()
    const response = new Response(c.res.body, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers: c.res.headers,
    })
    c.res = response
    const buff = await c.res.clone().arrayBuffer()
    c.res.headers.append('Content-Length', buff.byteLength.toString())
  }
  */
}
