/**
 * @module
 * CSRF Protection Middleware for Hono.
 */

import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'

type IsAllowedOriginHandler = (origin: string, context: Context) => boolean
interface CSRFOptions {
  origin?: string | string[] | IsAllowedOriginHandler
  useFetchMetadata?: boolean
}

const isSafeMethodRe = /^(GET|HEAD|OPTIONS)$/
const isRequestedByFormElementRe =
  /^\b(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)\b/i

/**
 * Modern CSRF protection using Fetch Metadata
 */
const checkFetchMetadata = (c: Context, handler: IsAllowedOriginHandler): boolean => {
  // Always allow safe methods
  if (isSafeMethodRe.test(c.req.method)) {
    return true
  }

  const secFetchSite = c.req.header('sec-fetch-site')
  const origin = c.req.header('origin')

  // Check Sec-Fetch-Site header first
  if (secFetchSite) {
    if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
      return true
    }
    // cross-site or same-site - delegate to handler
    return origin ? handler(origin, c) : false
  }

  // Fallback to Origin header check
  if (!origin) {
    // No Origin header - assume same-origin or non-browser request
    return true
  }

  // Check if origin hostname matches Host header
  try {
    const originUrl = new URL(origin)
    const hostHeader = c.req.header('host')
    // For the fallback case, we need to extract host from request URL if Host header is missing
    const requestUrl = new URL(c.req.url)
    const requestHost = hostHeader || requestUrl.host
    if (requestHost && originUrl.host === requestHost) {
      return true
    }
  } catch {
    // Invalid origin
  }

  // Use handler for final decision
  return handler(origin, c)
}

/**
 * CSRF Protection Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/csrf}
 *
 * @param {CSRFOptions} [options] - The options for the CSRF protection middleware.
 * @param {string|string[]|(origin: string, context: Context) => boolean} [options.origin] - Specify origins.
 * @param {boolean} [options.useFetchMetadata] - Enable modern Fetch Metadata-based protection.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * // Legacy CSRF protection
 * app.use(csrf())
 * app.use(csrf({ origin: 'myapp.example.com' }))
 *
 * // Modern Fetch Metadata-based protection with trusted origins
 * app.use(csrf({
 *   useFetchMetadata: true,
 *   origin: ['https://sso.example.com', 'https://api.example.com']
 * }))
 *
 * // Modern protection with bypass patterns
 * app.use(csrf({
 *   useFetchMetadata: true,
 *   origin: (origin, c) => {
 *     // Path-based bypasses
 *     if (c.req.path.startsWith('/api/webhook/')) return true
 *     if (c.req.path === '/auth/callback') return true
 *
 *     // Trusted origins
 *     const trusted = ['https://sso.example.com']
 *     return trusted.includes(origin)
 *   }
 * }))
 *
 * // Hybrid approach
 * app.use(csrf({
 *   origin: 'https://example.com', // works for both legacy and modern
 *   useFetchMetadata: true
 * }))
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

  return async function csrf(c, next) {
    // Use modern Fetch Metadata-based protection if enabled
    if (options?.useFetchMetadata) {
      if (!checkFetchMetadata(c, handler)) {
        const res = new Response('Forbidden', { status: 403 })
        throw new HTTPException(403, { res })
      }
    } else {
      // Legacy CSRF protection
      if (
        !isSafeMethodRe.test(c.req.method) &&
        isRequestedByFormElementRe.test(c.req.header('content-type') || 'text/plain') &&
        !isAllowedOrigin(c.req.header('origin'), c)
      ) {
        const res = new Response('Forbidden', { status: 403 })
        throw new HTTPException(403, { res })
      }
    }

    await next()
  }
}
