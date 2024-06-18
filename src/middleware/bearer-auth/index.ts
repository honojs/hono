/**
 * @module
 * Bearer Auth Middleware for Hono.
 */

import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import { timingSafeEqual } from '../../utils/buffer'

const TOKEN_STRINGS = '[A-Za-z0-9._~+/-]+=*'
const PREFIX = 'Bearer'
const HEADER = 'Authorization'

type BearerAuthOptions =
  | {
      token: string | string[]
      realm?: string
      prefix?: string
      headerName?: string
      hashFunction?: Function
    }
  | {
      realm?: string
      prefix?: string
      headerName?: string
      verifyToken: (token: string, c: Context) => boolean | Promise<boolean>
      hashFunction?: Function
    }

/**
 * Bearer Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/middleware/builtin/bearer-auth}
 *
 * @param {BearerAuthOptions} options - The options for the bearer authentication middleware.
 * @param {string | string[]} [options.token] - The string or array of strings to validate the incoming bearer token against.
 * @param {Function} [options.verifyToken] - The function to verify the token.
 * @param {string} [options.realm=""] - The domain name of the realm, as part of the returned WWW-Authenticate challenge header.
 * @param {string} [options.prefix="Bearer"] - The prefix (or known as `schema`) for the Authorization header value.
 * @param {string} [options.headerName=Authorization] - The header name.
 * @param {Function} [options.hashFunction] - A function to handle hashing for safe comparison of authentication tokens.
 * @returns {MiddlewareHandler} The middleware handler function.
 * @throws {Error} If neither "token" nor "verifyToken" options are provided.
 * @throws {HTTPException} If authentication fails, with 401 status code for missing or invalid token, or 400 status code for invalid request.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * const token = 'honoiscool'
 *
 * app.use('/api/*', bearerAuth({ token }))
 *
 * app.get('/api/page', (c) => {
 *   return c.json({ message: 'You are authorized' })
 * })
 * ```
 */
export const bearerAuth = (options: BearerAuthOptions): MiddlewareHandler => {
  if (!('token' in options || 'verifyToken' in options)) {
    throw new Error('bearer auth middleware requires options for "token"')
  }
  if (!options.realm) {
    options.realm = ''
  }
  if (!options.prefix) {
    options.prefix = PREFIX
  }

  const realm = options.realm?.replace(/"/g, '\\"')

  return async function bearerAuth(c, next) {
    const headerToken = c.req.header(options.headerName || HEADER)

    if (!headerToken) {
      // No Authorization header
      const res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': `${options.prefix} realm="` + realm + '"',
        },
      })
      throw new HTTPException(401, { res })
    } else {
      const regexp = new RegExp('^' + options.prefix + ' +(' + TOKEN_STRINGS + ') *$')
      const match = regexp.exec(headerToken)
      if (!match) {
        // Invalid Request
        const res = new Response('Bad Request', {
          status: 400,
          headers: {
            'WWW-Authenticate': `${options.prefix} error="invalid_request"`,
          },
        })
        throw new HTTPException(400, { res })
      } else {
        let equal = false
        if ('verifyToken' in options) {
          equal = await options.verifyToken(match[1], c)
        } else if (typeof options.token === 'string') {
          equal = await timingSafeEqual(options.token, match[1], options.hashFunction)
        } else if (Array.isArray(options.token) && options.token.length > 0) {
          for (const token of options.token) {
            if (await timingSafeEqual(token, match[1], options.hashFunction)) {
              equal = true
              break
            }
          }
        }
        if (!equal) {
          // Invalid Token
          const res = new Response('Unauthorized', {
            status: 401,
            headers: {
              'WWW-Authenticate': `${options.prefix} error="invalid_token"`,
            },
          })
          throw new HTTPException(401, { res })
        }
      }
    }
    await next()
  }
}
