import type { Context } from '../../context'

export const poweredBy = () => {
  return async (c: Context, next: Function) => {
    await next()
    // await c.res.headers.append('X-Powered-By', 'Hono')
    c.res.headers.append('X-Powered-By', 'Hono')
  }
}
