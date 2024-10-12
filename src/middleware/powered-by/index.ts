/**
 * @module
 * Powered By Middleware for Hono.
 */
import type { MiddlewareHandler } from '../../types'

type PoweredByOptions = {
  serverName?: string
}

export const poweredBy = (options?: PoweredByOptions): MiddlewareHandler => {
  return async function poweredBy(c, next) {
    await next()
    c.res.headers.set('X-Powered-By', options?.serverName ?? 'Hono')
  }
}
