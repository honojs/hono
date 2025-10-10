/**
 * @module
 * Trailing Slash Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'

/**
 * Trailing Slash Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/trailing-slash}
 *
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(trimTrailingSlash())
 * app.get('/about/me/', (c) => c.text('With Trailing Slash'))
 * ```
 */
export const trimTrailingSlash = (): MiddlewareHandler => {
  return async function trimTrailingSlash(c, next) {
    await next()

    if (
      c.res.status === 404 &&
      (c.req.method === 'GET' || c.req.method === 'HEAD') &&
      c.req.path !== '/' &&
      c.req.path.at(-1) === '/'
    ) {
      const url = new URL(c.req.url)
      url.pathname = url.pathname.substring(0, url.pathname.length - 1)

      c.res = c.redirect(url.toString(), 301)
    }
  }
}

/**
 * Append trailing slash middleware for Hono.
 * Append a trailing slash to the URL if it doesn't have one. For example, `/path/to/page` will be redirected to `/path/to/page/`.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/trailing-slash}
 *
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(appendTrailingSlash())
 * ```
 */
export const appendTrailingSlash = (): MiddlewareHandler => {
  return async function appendTrailingSlash(c, next) {
    await next()

    if (
      c.res.status === 404 &&
      (c.req.method === 'GET' || c.req.method === 'HEAD') &&
      c.req.path.at(-1) !== '/'
    ) {
      const url = new URL(c.req.url)
      url.pathname += '/'

      c.res = c.redirect(url.toString(), 301)
    }
  }
}
