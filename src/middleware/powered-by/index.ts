import type { MiddlewareHandler } from '../../types'

export const poweredBy = (): MiddlewareHandler => {
  return async function poweredBy(c, next) {
    await next()
    c.res.headers.set('X-Powered-By', 'Hono')
  }
}
