/**
 * @module
 * Pretty JSON Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'

interface PrettyOptions {
  /**
   * Number of spaces for indentation.
   * @default 2
   */
  space?: number

  /**
   * Query conditions for when to Pretty.
   * @default 'pretty'
   */
  query?: string
}

/**
 * Pretty JSON Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/pretty-json}
 *
 * @param options - The options for the pretty JSON middleware.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(prettyJSON()) // With options: prettyJSON({ space: 4 })
 * app.get('/', (c) => {
 *   return c.json({ message: 'Hono!' })
 * })
 * ```
 */
export const prettyJSON = (options?: PrettyOptions): MiddlewareHandler => {
  const targetQuery = options?.query ?? 'pretty'
  return async function prettyJSON(c, next) {
    const pretty = c.req.query(targetQuery) || c.req.query(targetQuery) === ''
    await next()
    if (pretty && c.res.headers.get('Content-Type')?.startsWith('application/json')) {
      const obj = await c.res.json()
      c.res = new Response(JSON.stringify(obj, null, options?.space ?? 2), c.res)
    }
  }
}
