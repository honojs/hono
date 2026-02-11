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
 * Cache to store the result of handler checks.
 *
 * Determining if a handler is a "middleware" or an "actual handler" involves:
 * 1. Unwrapping composed handlers recursively via `findTargetHandler`.
 * 2. Checking the function length via `isMiddleware`.
 *
 * Since Hono handlers are immutable references in runtime, performing this calculation
 * for every request is redundant. We use a `WeakMap` to cache the boolean result.
 * This optimization:
 * - Reduces CPU overhead by changing O(depth) recursion to O(1) map lookup.
 * - Handles dynamic route registration safely (new handlers get new entries).
 * - Prevents memory leaks (entries are GC'd when handlers are released).
 */
const handlerTypeCache = new WeakMap<Function, boolean>()

const isActualHandler = (handler: Function): boolean => {
  if (handlerTypeCache.has(handler)) {
    return handlerTypeCache.get(handler)!
  }
  const targetHandler = findTargetHandler(handler)
  const result = !isMiddleware(targetHandler)
  handlerTypeCache.set(handler, result)
  return result
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
    const hasActualHandler = routes.some((route) => isActualHandler(route.handler))

    if (!hasActualHandler) {
      // No actual handler found - return 404 immediately
      return options?.onNotFound ? options.onNotFound(c) : c.notFound()
    }

    await next()
  }
}
