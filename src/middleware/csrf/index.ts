/**
 * @module
 * CSRF Protection Middleware for Hono.
 */

import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'

type IsAllowedOriginHandler = (origin: string, context: Context) => boolean
type IsAllowedSecFetchSiteHandler = (secFetchSite: string, context: Context) => boolean
interface CSRFOptions {
  origin?: string | string[] | IsAllowedOriginHandler
  secFetchSite?: string | string[] | IsAllowedSecFetchSiteHandler
}

const isSafeMethodRe = /^(GET|HEAD)$/
const isRequestedByFormElementRe =
  /^\b(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)\b/i

/**
 * CSRF Protection Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/csrf}
 *
 * @param {CSRFOptions} [options] - The options for the CSRF protection middleware.
 * @param {string|string[]|(origin: string, context: Context) => boolean} [options.origin] - Specify origins.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(csrf())
 *
 * // Specifying origins with using `origin` option
 * // string
 * app.use(csrf({ origin: 'myapp.example.com' }))
 *
 * // string[]
 * app.use(
 *   csrf({
 *     origin: ['myapp.example.com', 'development.myapp.example.com'],
 *   })
 * )
 *
 * // Function
 * // It is strongly recommended that the protocol be verified to ensure a match to `$`.
 * // You should *never* do a forward match.
 * app.use(
 *   '*',
 *   csrf({
 *     origin: (origin) => /https:\/\/(\w+\.)?myapp\.example\.com$/.test(origin),
 *   })
 * )
 *
 * // Use sec-fetch-site header to allow requests
 *
 * // By default, allowed if sec-fetch-site is same-origin
 * app.use(csrf())
 *
 * // string[]
 * // You can allow requests from the same site by specifying the following.
 * // This is easier and more reliable than using a regular expression in origin to extend permissions
 * app.use(csrf({ secFetchSite: ['same-origin', 'same-site'] }))
 *
 * // Function
 * // You can use functions to allow for complex conditions
 * app.use(csrf({ secFetchSite: (secFetchSite) => secFetchSite === 'same-origin' }))
 * ```
 */
export const csrf = (options?: CSRFOptions): MiddlewareHandler => {
  const handler: IsAllowedOriginHandler = ((optsOrigin) => {
    if (!optsOrigin) {
      return (origin, c) => origin === new URL(c.req.url).origin
    } else if (typeof optsOrigin === 'string') {
      return (origin) => origin === optsOrigin
    } else if (typeof optsOrigin === 'function') {
      return optsOrigin
    } else {
      return (origin) => optsOrigin.includes(origin)
    }
  })(options?.origin)
  const isAllowedOrigin = (origin: string | undefined, c: Context) => {
    if (origin === undefined) {
      // denied always when origin header is not present
      return false
    }
    return handler(origin, c)
  }

  const allowedSecFetchSiteHandler: IsAllowedSecFetchSiteHandler = ((optsSecFetchSite) => {
    if (!optsSecFetchSite) {
      return (secFetchSite) => secFetchSite === 'same-origin'
    } else if (typeof optsSecFetchSite === 'string') {
      return (secFetchSite) => secFetchSite === optsSecFetchSite
    } else if (typeof optsSecFetchSite === 'function') {
      return optsSecFetchSite
    } else {
      return (secFetchSite) => optsSecFetchSite.includes(secFetchSite)
    }
  })(options?.secFetchSite)
  const isAllowedSecFetchSite = (secFetchSite: string | undefined, c: Context) => {
    if (secFetchSite === undefined) {
      return false
    }
    return allowedSecFetchSiteHandler(secFetchSite, c)
  }

  return async function csrf(c, next) {
    if (
      !isSafeMethodRe.test(c.req.method) &&
      isRequestedByFormElementRe.test(c.req.header('content-type') || 'text/plain') &&
      !isAllowedSecFetchSite(c.req.header('sec-fetch-site'), c) &&
      !isAllowedOrigin(c.req.header('origin'), c)
    ) {
      const res = new Response('Forbidden', {
        status: 403,
      })
      throw new HTTPException(403, { res })
    }

    await next()
  }
}
