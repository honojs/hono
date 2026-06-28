/**
 * @module
 * Method Not Allowed Middleware for Hono.
 */

import type { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import { METHOD_NAME_ALL } from '../../router'
import { TrieRouter } from '../../router/trie-router'
import type { MiddlewareHandler } from '../../types'

type MethodNotAllowedOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<any, any, any>
}

/**
 * Method Not Allowed Middleware for Hono.
 *
 * @param {MethodNotAllowedOptions} options - The options for the method not allowed middleware.
 * @param {Hono} options.app - The instance of Hono is used in your application.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(methodNotAllowed({ app }))
 *
 * app.get('/', (c) => c.text('Hello World!'))
 * // A `POST /` request now returns `405 Method Not Allowed` with `Allow: GET`.
 * ```
 */
export const methodNotAllowed = (options: MethodNotAllowedOptions): MiddlewareHandler => {
  const { app } = options
  let methodRouter: TrieRouter<string[]> | undefined

  return async function methodNotAllowed(c, next) {
    await next()

    if (c.res.status !== 404) {
      return
    }

    if (!methodRouter) {
      const methodsByPath = new Map<string, string[]>()
      for (const route of app.routes) {
        // Skip middleware registered with `app.use()` and `app.all()`.
        if (route.method === METHOD_NAME_ALL) {
          continue
        }
        const methods = methodsByPath.get(route.path) ?? []
        methods.push(route.method.toUpperCase())
        methodsByPath.set(route.path, methods)
      }
      methodRouter = new TrieRouter<string[]>()
      for (const [path, methods] of methodsByPath) {
        methodRouter.add(METHOD_NAME_ALL, path, methods)
      }
    }

    const requestMethod = c.req.method.toUpperCase()
    // A path can match several routes (e.g. `*` and an exact path), so use a Set to drop duplicates.
    const allowedMethods = new Set<string>()
    for (const [methods] of methodRouter.match(METHOD_NAME_ALL, c.req.path)[0]) {
      for (const method of methods) {
        allowedMethods.add(method)
      }
    }
    allowedMethods.delete(requestMethod)

    if (allowedMethods.size === 0) {
      return
    }

    const res = new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: Array.from(allowedMethods).join(', '),
      },
    })
    throw new HTTPException(405, { res })
  }
}
