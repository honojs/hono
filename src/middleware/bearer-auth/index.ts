/**
 * @module
 * Bearer Auth Middleware for Hono.
 */

import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import { timingSafeEqual } from '../../utils/buffer'
import type { ContentfulStatusCode } from '../../utils/http-status'

const TOKEN_STRINGS = '[A-Za-z0-9._~+/-]+=*'
const PREFIX = 'Bearer'
const HEADER = 'Authorization'

type MessageFunction = (c: Context) => string | object | Promise<string | object>

type BearerAuthOptions =
  | {
      token: string | string[]
      realm?: string
      prefix?: string
      headerName?: string
      hashFunction?: Function
      noAuthenticationHeaderMessage?: string | object | MessageFunction
      invalidAuthenticationHeaderMessage?: string | object | MessageFunction
      invalidTokenMessage?: string | object | MessageFunction
    }
  | {
      realm?: string
      prefix?: string
      headerName?: string
      verifyToken: (token: string, c: Context) => boolean | Promise<boolean>
      hashFunction?: Function
      noAuthenticationHeaderMessage?: string | object | MessageFunction
      invalidAuthenticationHeaderMessage?: string | object | MessageFunction
      invalidTokenMessage?: string | object | MessageFunction
    }

/**
 * Bearer Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/bearer-auth}
 *
 * @param {BearerAuthOptions} options - The options for the bearer authentication middleware.
 * @param {string | string[]} [options.token] - The string or array of strings to validate the incoming bearer token against.
 * @param {Function} [options.verifyToken] - The function to verify the token.
 * @param {string} [options.realm=""] - The domain name of the realm, as part of the returned WWW-Authenticate challenge header.
 * @param {string} [options.prefix="Bearer"] - The prefix (or known as `schema`) for the Authorization header value. If set to the empty string, no prefix is expected.
 * @param {string} [options.headerName=Authorization] - The header name.
 * @param {Function} [options.hashFunction] - A function to handle hashing for safe comparison of authentication tokens.
 * @param {string | object | MessageFunction} [options.noAuthenticationHeaderMessage="Unauthorized"] - The no authentication header message.
 * @param {string | object | MessageFunction} [options.invalidAuthenticationHeaderMessage="Bad Request"] - The invalid authentication header message.
 * @param {string | object | MessageFunction} [options.invalidTokenMessage="Unauthorized"] - The invalid token message.
 * @returns {MiddlewareHandler} The middleware handler function.
 * @throws {Error} If neither "token" nor "verifyToken" options are provided.
 * @throws {HTTPException} If authentication fails, with 401 status code for missing or invalid token, or 400 status code for invalid request.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * const token = 'honoishot'
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
  if (options.prefix === undefined) {
    options.prefix = PREFIX
  }

  const realm = options.realm?.replace(/"/g, '\\"')
  const prefixRegexStr = options.prefix === '' ? '' : `${options.prefix} +`
  const regexp = new RegExp(`^${prefixRegexStr}(${TOKEN_STRINGS}) *$`)
  const wwwAuthenticatePrefix = options.prefix === '' ? '' : `${options.prefix} `

  const throwHTTPException = async (
    c: Context,
    status: ContentfulStatusCode,
    wwwAuthenticateHeader: string,
    messageOption: string | object | MessageFunction
  ): Promise<Response> => {
    const headers = {
      'WWW-Authenticate': wwwAuthenticateHeader,
    }
    const responseMessage =
      typeof messageOption === 'function' ? await messageOption(c) : messageOption
    const res =
      typeof responseMessage === 'string'
        ? new Response(responseMessage, { status, headers })
        : new Response(JSON.stringify(responseMessage), {
            status,
            headers: {
              ...headers,
              'content-type': 'application/json',
            },
          })
    throw new HTTPException(status, { res })
  }

  return async function bearerAuth(c, next) {
    const headerToken = c.req.header(options.headerName || HEADER)
    if (!headerToken) {
      // No Authorization header
      await throwHTTPException(
        c,
        401,
        `${wwwAuthenticatePrefix}realm="${realm}"`,
        options.noAuthenticationHeaderMessage || 'Unauthorized'
      )
    } else {
      const match = regexp.exec(headerToken)
      if (!match) {
        // Invalid Request
        await throwHTTPException(
          c,
          400,
          `${wwwAuthenticatePrefix}error="invalid_request"`,
          options.invalidAuthenticationHeaderMessage || 'Bad Request'
        )
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
          await throwHTTPException(
            c,
            401,
            `${wwwAuthenticatePrefix}error="invalid_token"`,
            options.invalidTokenMessage || 'Unauthorized'
          )
        }
      }
    }
    await next()
  }
}
