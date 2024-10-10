/**
 * @module
 * Powered By Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'

export const poweredBy = (serverName = 'Hono'): MiddlewareHandler => {
  return async function poweredBy(c, next) {
    await next()
    c.res.headers.set('X-Powered-By', serverName)
  }
}
