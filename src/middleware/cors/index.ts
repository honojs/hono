/**
 * @module
 * CORS Middleware for Hono.
 */

import type { Context } from '../../context'
import type { MiddlewareHandler } from '../../types'

type CORSOptions = {
  origin: string | string[] | ((origin: string, c: Context) => string | undefined | null)
  allowMethods?: string[]
  allowHeaders?: string[]
  maxAge?: number
  credentials?: boolean
  exposeHeaders?: string[]
}

/**
 * CORS Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/cors}
 *
 * @param {CORSOptions} [options] - The options for the CORS middleware.
 * @param {string | string[] | ((origin: string, c: Context) => string | undefined | null)} [options.origin='*'] - The value of "Access-Control-Allow-Origin" CORS header.
 * @param {string[]} [options.allowMethods=['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH']] - The value of "Access-Control-Allow-Methods" CORS header.
 * @param {string[]} [options.allowHeaders=[]] - The value of "Access-Control-Allow-Headers" CORS header.
 * @param {number} [options.maxAge] - The value of "Access-Control-Max-Age" CORS header.
 * @param {boolean} [options.credentials] - The value of "Access-Control-Allow-Credentials" CORS header.
 * @param {string[]} [options.exposeHeaders=[]] - The value of "Access-Control-Expose-Headers" CORS header.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use('/api/*', cors())
 * app.use(
 *   '/api2/*',
 *   cors({
 *     origin: 'http://example.com',
 *     allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests'],
 *     allowMethods: ['POST', 'GET', 'OPTIONS'],
 *     exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
 *     maxAge: 600,
 *     credentials: true,
 *   })
 * )
 *
 * app.all('/api/abc', (c) => {
 *   return c.json({ success: true })
 * })
 * app.all('/api2/abc', (c) => {
 *   return c.json({ success: true })
 * })
 * ```
 */
export const cors = (options?: CORSOptions): MiddlewareHandler => {
  const defaults: CORSOptions = {
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
    allowHeaders: [],
    exposeHeaders: [],
  }
  const opts = {
    ...defaults,
    ...options,
  }

  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === 'string') {
      if (optsOrigin === '*') {
        return () => optsOrigin
      } else {
        return (origin: string) => (optsOrigin === origin ? origin : null)
      }
    } else if (typeof optsOrigin === 'function') {
      return optsOrigin
    } else {
      return (origin: string) => (optsOrigin.includes(origin) ? origin : null)
    }
  })(opts.origin)

  return async function cors(c, next) {
    function set(key: string, value: string) {
      c.res.headers.set(key, value)
    }

    const allowOrigin = findAllowOrigin(c.req.header('origin') || '', c)
    if (allowOrigin) {
      set('Access-Control-Allow-Origin', allowOrigin)
    }

    // Suppose the server sends a response with an Access-Control-Allow-Origin value with an explicit origin (rather than the "*" wildcard).
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    if (opts.origin !== '*') {
      const existingVary = c.req.header('Vary')

      if (existingVary) {
        set('Vary', existingVary)
      } else {
        set('Vary', 'Origin')
      }
    }

    if (opts.credentials) {
      set('Access-Control-Allow-Credentials', 'true')
    }

    if (opts.exposeHeaders?.length) {
      set('Access-Control-Expose-Headers', opts.exposeHeaders.join(','))
    }

    if (c.req.method === 'OPTIONS') {
      if (opts.maxAge != null) {
        set('Access-Control-Max-Age', opts.maxAge.toString())
      }

      if (opts.allowMethods?.length) {
        set('Access-Control-Allow-Methods', opts.allowMethods.join(','))
      }

      let headers = opts.allowHeaders
      if (!headers?.length) {
        const requestHeaders = c.req.header('Access-Control-Request-Headers')
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/)
        }
      }
      if (headers?.length) {
        set('Access-Control-Allow-Headers', headers.join(','))
        c.res.headers.append('Vary', 'Access-Control-Request-Headers')
      }

      c.res.headers.delete('Content-Length')
      c.res.headers.delete('Content-Type')

      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: c.res.statusText,
      })
    }
    await next()
  }
}
