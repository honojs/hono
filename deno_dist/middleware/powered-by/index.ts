import type { Context } from '../../context.ts'
import type { Next } from '../../hono.ts'

export const poweredBy = () => {
  return async (c: Context, next: Next) => {
    await next()
    c.res.headers.append('X-Powered-By', 'Hono')
  }
}
