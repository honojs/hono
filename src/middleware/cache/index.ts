/**
 * @module
 * Cache Middleware for Hono.
 */

import type { Context } from '../../context'
import type { MiddlewareHandler } from '../../types'
import type { StatusCode } from '../../utils/http-status'

/**
 * status codes that can be cached by default.
 */
const defaultCacheableStatusCodes: ReadonlyArray<StatusCode> = [200]

const varyWildcardRegExp = /(?:^|,)\s*\*\s*(?:,|$)/

/**
 * Cache Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/cache}
 *
 * @param {Object} options - The options for the cache middleware.
 * @param {string | Function} options.cacheName - The name of the cache. Can be used to store multiple caches with different identifiers.
 * @param {boolean} [options.wait=false] - A boolean indicating if Hono should wait for the Promise of the `cache.put` function to resolve before continuing with the request. Required to be true for the Deno environment.
 * @param {string} [options.cacheControl] - A string of directives for the `Cache-Control` header.
 * @param {string | string[]} [options.vary] - Sets the `Vary` header in the response. If the original response header already contains a `Vary` header, the values are merged, removing any duplicates.
 * @param {Function} [options.keyGenerator] - Generates keys for every request in the `cacheName` store. This can be used to cache data based on request parameters or context parameters.
 * @param {number[]} [options.cacheableStatusCodes=[200]] - An array of status codes that can be cached.
 * @returns {MiddlewareHandler} The middleware handler function.
 * @throws {Error} If the `vary` option includes "*".
 *
 * @example
 * ```ts
 * app.get(
 *   '*',
 *   cache({
 *     cacheName: 'my-app',
 *     cacheControl: 'max-age=3600',
 *   })
 * )
 * ```
 */
export const cache = (options: {
  cacheName: string | ((c: Context) => Promise<string> | string)
  wait?: boolean
  cacheControl?: string
  vary?: string | string[]
  keyGenerator?: (c: Context) => Promise<string> | string
  cacheableStatusCodes?: StatusCode[]
}): MiddlewareHandler => {
  if (!globalThis.caches) {
    console.log('Cache Middleware is not enabled because caches is not defined.')
    return async (_c, next) => await next()
  }

  if (options.wait === undefined) {
    options.wait = false
  }

  const cacheControlDirectives = options.cacheControl
    ?.split(',')
    .map((directive) => directive.toLowerCase())
  const varyDirectives = Array.isArray(options.vary)
    ? options.vary
    : options.vary?.split(',').map((directive) => directive.trim())
  // RFC 7231 Section 7.1.4 specifies that "*" is not allowed in Vary header.
  // See: https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.4
  if (options.vary?.includes('*')) {
    throw new Error(
      'Middleware vary configuration cannot include "*", as it disallows effective caching.'
    )
  }

  const cacheableStatusCodes = new Set<number>(
    options.cacheableStatusCodes ?? defaultCacheableStatusCodes
  )

  const addHeader = (c: Context) => {
    if (cacheControlDirectives) {
      const existingDirectives =
        c.res.headers
          .get('Cache-Control')
          ?.split(',')
          .map((d) => d.trim().split('=', 1)[0]) ?? []
      for (const directive of cacheControlDirectives) {
        let [name, value] = directive.trim().split('=', 2)
        name = name.toLowerCase()
        if (!existingDirectives.includes(name)) {
          c.header('Cache-Control', `${name}${value ? `=${value}` : ''}`, { append: true })
        }
      }
    }

    if (varyDirectives) {
      const existingDirectives =
        c.res.headers
          .get('Vary')
          ?.split(',')
          .map((d) => d.trim()) ?? []

      const vary = Array.from(
        new Set(
          [...existingDirectives, ...varyDirectives].map((directive) => directive.toLowerCase())
        )
      ).sort()

      if (vary.includes('*')) {
        c.header('Vary', '*')
      } else {
        c.header('Vary', vary.join(', '))
      }
    }
  }

  const shouldSkipCache = (res: Response) => {
    const vary = res.headers.get('Vary')
    // Don't cache for Vary: *
    // https://www.rfc-editor.org/rfc/rfc9111#section-4.1
    return vary && varyWildcardRegExp.test(vary)
  }

  return async function cache(c, next) {
    let key = c.req.url
    if (options.keyGenerator) {
      key = await options.keyGenerator(c)
    }

    const cacheName =
      typeof options.cacheName === 'function' ? await options.cacheName(c) : options.cacheName
    const cache = await caches.open(cacheName)
    const response = await cache.match(key)
    if (response) {
      return new Response(response.body, response)
    }

    await next()
    if (!cacheableStatusCodes.has(c.res.status)) {
      return
    }
    addHeader(c)

    if (shouldSkipCache(c.res)) {
      return
    }

    const res = c.res.clone()
    if (options.wait) {
      await cache.put(key, res)
    } else {
      c.executionCtx.waitUntil(cache.put(key, res))
    }
  }
}
