/**
 * @module
 * Method Not Allowed Middleware for Hono.
 */

import type { Context } from '../../context'
import { basePath, matchedRoutes } from '../../helper/route'
import type { Hono } from '../../hono'
import { METHOD_NAME_ALL } from '../../router'
import { TrieRouter } from '../../router/trie-router'
import type { Env, MiddlewareHandler } from '../../types'

type MethodNotAllowedHandler<E extends Env> = (
  c: Context<E>,
  allowedMethods: string[]
) => Response | Promise<Response>

type MethodNotAllowedOptions<E extends Env> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<E, any, any>
  onMethodNotAllowed?: MethodNotAllowedHandler<E>
}

/**
 * Method Not Allowed Middleware for Hono.
 *
 * Returns a `405 Method Not Allowed` response with an `Allow` header when the request path
 * matches a registered route but the request method is not supported.
 *
 * @param {MethodNotAllowedOptions} options - The options for the middleware.
 * @param {Hono} options.app - The Hono instance used by the application.
 * @param {MethodNotAllowedHandler} [options.onMethodNotAllowed] - Generates the response, including its `Allow` header.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(methodNotAllowed({ app }))
 *
 * app.get('/hello', (c) => c.text('Hello!'))
 * app.post('/hello', (c) => c.text('Posted!'))
 *
 * // PUT /hello -> 405 Method Not Allowed
 * // Allow: GET, HEAD, POST
 * ```
 *
 * @example
 * ```ts
 * app.use(
 *   methodNotAllowed({
 *     app,
 *     onMethodNotAllowed: (c, methods) =>
 *       c.json({ error: 'Method Not Allowed' }, 405, { Allow: methods.join(', ') }),
 *   })
 * )
 * ```
 */
export const methodNotAllowed = <E extends Env = Env>(
  options: MethodNotAllowedOptions<E>
): MiddlewareHandler<E> => {
  let methodRouter: TrieRouter<string[]> | undefined

  return async function methodNotAllowed(c, next) {
    const routeIndex = c.req.routeIndex
    await next()

    if (c.res.status !== 404) {
      return
    }

    if (c.error) {
      return
    }

    if (!methodRouter) {
      const methodsByPath = new Map<string, Set<string>>()

      for (const route of options.app.routes) {
        // Hono does not distinguish middleware registered with `app.use()` from handlers
        // registered with `app.all()`, so `ALL` routes cannot contribute to the Allow header.
        if (route.method === METHOD_NAME_ALL || route.method === 'HEAD') {
          continue
        }

        const methods = methodsByPath.get(route.path) ?? new Set<string>()
        methods.add(route.method)

        // Hono dispatches HEAD requests to GET routes.
        if (route.method === 'GET') {
          methods.add('HEAD')
        }

        methodsByPath.set(route.path, methods)
      }

      methodRouter = new TrieRouter()
      for (const [path, methods] of methodsByPath) {
        methodRouter.add(METHOD_NAME_ALL, path, [...methods])
      }
    }

    let requestPath = c.req.path
    const routes = matchedRoutes(c)
    const currentRoute = routes[routeIndex]
    const sourceRoute = options.app.routes.find((route) => route.handler === methodNotAllowed)
    if (currentRoute && sourceRoute) {
      const currentBasePathParts = basePath(c, routeIndex).split('/').filter(Boolean)
      const sourceBasePathLength = sourceRoute.basePath.split('/').filter(Boolean).length
      const mountBasePathParts = currentBasePathParts.slice(
        0,
        currentBasePathParts.length - sourceBasePathLength
      )
      if (mountBasePathParts.length > 0) {
        const mountBasePath = `/${mountBasePathParts.join('/')}`
        requestPath = c.req.path.slice(mountBasePath.length) || '/'
      }
    }

    const allowedMethods = new Set<string>()
    for (const [methods] of methodRouter.match(METHOD_NAME_ALL, requestPath)[0]) {
      for (const method of methods) {
        allowedMethods.add(method)
      }
    }

    if (allowedMethods.size === 0 || allowedMethods.has(c.req.method)) {
      return
    }

    // Prevent stale headers from being carried over from the 404 response.
    c.res.headers.delete('Allow')
    c.res.headers.delete('Content-Length')

    const methods = [...allowedMethods]
    const allow = methods.join(', ')
    c.res = options.onMethodNotAllowed
      ? await options.onMethodNotAllowed(c, methods)
      : c.text('Method Not Allowed', 405, { Allow: allow })
  }
}
