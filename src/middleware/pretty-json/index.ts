import type { MiddlewareHandler } from '../../types'

type prettyOptions = {
  space: number
}

/**
 * Pretty JSON middleware for Hono.
 *
 * @see {@link https://hono.dev/middleware/builtin/pretty-json}
 *
 * @param {prettyOptions} [options] - The options for the pretty JSON middleware.
 * @param {number} [options.space=2] - Number of spaces for indentation.
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
export const prettyJSON = (options: prettyOptions = { space: 2 }): MiddlewareHandler => {
  return async function prettyJSON(c, next) {
    const pretty = c.req.query('pretty') || c.req.query('pretty') === '' ? true : false
    await next()
    if (pretty && c.res.headers.get('Content-Type')?.startsWith('application/json')) {
      const obj = await c.res.json()
      c.res = new Response(JSON.stringify(obj, null, options.space), c.res)
    }
  }
}
