/**
 * @module
 * Method Not Allowed Middleware for Hono.
 */

import type { Hono } from '../../hono'
import { METHOD_NAME_ALL } from '../../router'
import { TrieRouter } from '../../router/trie-router/router'
import type { Env, MiddlewareHandler } from '../../types'

export type MethodNotAllowedOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<any, any, any>
}

/**
 * Method Not Allowed Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/method-not-allowed}
 *
 * @param {MethodNotAllowedOptions} options - The options for the method not allowed middleware.
 * @param {Hono} options.app - The instance of Hono used in your application.
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
 * // GET /hello  => 200 "Hello!"
 * // POST /hello => 200 "Posted!"
 * // PUT /hello  => 405 Method Not Allowed (Allow: GET, POST)
 * // GET /foo    => 404 Not Found
 * ```
 */
export const methodNotAllowed = <E extends Env = Env>(
  options: MethodNotAllowedOptions
): MiddlewareHandler<E> => {
  let methodNotAllowedRouter: TrieRouter<string[]> | undefined

  return async function methodNotAllowed(c, next) {
    await next()

    if (c.res.status !== 404) {
      return
    }

    if (!methodNotAllowedRouter) {
      const paths = new Map<string, string[]>()
      for (const route of options.app.routes) {
        if (route.method === METHOD_NAME_ALL) {
          continue
        }
        const methods = paths.get(route.path) || []
        methods.push(route.method.toUpperCase())
        paths.set(route.path, methods)
      }
      methodNotAllowedRouter = new TrieRouter()
      for (const [path, methods] of paths) {
        methodNotAllowedRouter.add(METHOD_NAME_ALL, path, methods)
      }
    }

    const matched = methodNotAllowedRouter.match(METHOD_NAME_ALL, c.req.path)[0]
    const methods = [...new Set(matched.flatMap(([route]) => route))]

    if (methods.length === 0) {
      return
    }

    if (methods.includes(c.req.method.toUpperCase())) {
      return
    }

    c.res = new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: methods.join(', '),
      },
    })
  }
}
