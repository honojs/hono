import type { MiddlewareHandler } from '../../types.ts'

/**
 * Trim the trailing slash from the URL if it does have one. For example, `/path/to/page/` will be redirected to `/path/to/page`.
 * @access public
 * @example app.use(trimTrailingSlash())
 */
export const trimTrailingSlash = (): MiddlewareHandler => {
  return async function trimTrailingSlash(c, next) {
    await next()

    if (
      c.res.status === 404 &&
      c.req.method === 'GET' &&
      c.req.path !== '/' &&
      c.req.path[c.req.path.length - 1] === '/'
    ) {
      const url = new URL(c.req.url)
      url.pathname = url.pathname.substring(0, url.pathname.length - 1)

      c.res = c.redirect(url.toString(), 301)
    }
  }
}

/**
 * Append a trailing slash to the URL if it doesn't have one. For example, `/path/to/page` will be redirected to `/path/to/page/`.
 * @access public
 * @example app.use(appendTrailingSlash())
 */
export const appendTrailingSlash = (): MiddlewareHandler => {
  return async function appendTrailingSlash(c, next) {
    await next()

    if (
      c.res.status === 404 &&
      c.req.method === 'GET' &&
      c.req.path[c.req.path.length - 1] !== '/'
    ) {
      const url = new URL(c.req.url)
      url.pathname += '/'

      c.res = c.redirect(url.toString(), 301)
    }
  }
}
