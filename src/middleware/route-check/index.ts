/**
 * @module
 * Route Check Middleware for Hono.
 */

import type { Context } from '../../context'
import { matchedRoutes } from '../../helper/route'
import type { MiddlewareHandler } from '../../types'
import { findTargetHandler, isMiddleware } from '../../utils/handler'

type RouteCheckOptions = {
  /**
   * Custom handler to execute when no route is found.
   * If not specified, returns default 404 response.
   */
  onNotFound?: (c: Context) => Response | Promise<Response>
}

/**
 * Route Check Middleware for Hono.
 *
 * Checks if a route handler exists before executing subsequent middleware.
 * Returns 404 immediately for non-existent routes, skipping expensive operations
 * like authentication.
 *
 * @param {RouteCheckOptions} options - Configuration options.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * app.use('/admin/*', routeCheck())
 * app.use('/admin/*', bearerAuth({ token: 'my-secret' }))
 *
 * app.get('/admin/dashboard', (c) => c.text('Dashboard'))
 *
 * // GET /admin/non-existent returns 404 without authentication
 * // GET /admin/dashboard requires authentication
 * ```
 *
 * @example
 * With custom not found handler:
 * ```ts
 * app.use('/api/*', routeCheck({
 *   onNotFound: (c) => c.json({ error: 'Not Found' }, 404)
 * }))
 * ```
 */
export const routeCheck = (options?: RouteCheckOptions): MiddlewareHandler => {
  return async (c, next) => {
    const routes = matchedRoutes(c)

    // Check if there's at least one actual handler (not middleware)
    const hasActualHandler = routes.some((route) => {
      const targetHandler = findTargetHandler(route.handler)
      return !isMiddleware(targetHandler)
    })

    if (!hasActualHandler) {
      // No actual handler found - return 404 immediately
      return options?.onNotFound ? options.onNotFound(c) : c.notFound()
    }

    await next()
  }
}
