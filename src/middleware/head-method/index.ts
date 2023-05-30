import type { Hono } from '../../hono'
import type { MiddlewareHandler } from '../../types'

type HeadMethodOptions = {
  app: Hono
}

export const headMethod = ({ app }: HeadMethodOptions): MiddlewareHandler => {
  return async (c, next) => {
    if (c.req.method === 'HEAD') {
      const res = await app.fetch(
        new Request(c.req.url, {
          ...c.req.raw,
          method: 'GET',
        })
      )
      return new Response(null, res)
    }
    await next()
  }
}
