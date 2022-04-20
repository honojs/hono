import type { Context } from '@/context'
import type { Next } from '@/hono'

export const poweredBy = () => {
  return async (c: Context, next: Next) => {
    await next()
    c.res.headers.append('X-Powered-By', 'Hono')
  }
}
