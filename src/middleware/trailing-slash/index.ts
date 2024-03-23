import type { MiddlewareHandler } from '../../types'

/**
 * Trim the trailing slash from the URL if it does have one. For example, `/path/to/page/` will be redirected to `/path/to/page`.
 * @access public
 * @example app.use(trimTrailingSlash())
 */
export const trimTrailingSlash = (): MiddlewareHandler => {
  return async function trimTrailingSlash(c, next) {
    const { path, url } = c.req

    return path[path.length - 1] === '/' && path !== '/'
      ? c.redirect(url.substring(0, url.length - 1), 301)
      : await next()
  }
}

/**
 * Append a trailing slash to the URL if it doesn't have one. For example, `/path/to/page` will be redirected to `/path/to/page/`.
 * @access public
 * @example app.use(appendTrailingSlash())
 */
export const appendTrailingSlash = (): MiddlewareHandler => {
  return async function appendTrailingSlash(c, next) {
    const { path, url } = c.req

    return path[path.length - 1] !== '/' ? c.redirect(`${url}/`, 301) : await next()
  }
}
