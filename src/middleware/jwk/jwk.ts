/**
 * @module
 * JWK Auth Middleware for Hono.
 */

import type { Context } from '../../context'
import { getCookie, getSignedCookie } from '../../helper/cookie'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import type { CookiePrefixOptions } from '../../utils/cookie'
import { Jwt } from '../../utils/jwt'
import '../../context'
import type { HonoJsonWebKey } from '../../utils/jwt/jws'
import type { VerifyOptions } from '../../utils/jwt/jwt'

const HEADER = 'Authorization'

type MessageFunction = (c: Context) => string | object | Promise<string | object>
type CustomizedErrorResponseOptions = {
  wwwAuthenticateHeader?: string | object | MessageFunction
  message?: string | object | MessageFunction
}

type JwkOptions =
  | {
      keys: HonoJsonWebKey[] | ((ctx: Context) => Promise<HonoJsonWebKey[]> | HonoJsonWebKey[])
      allowAnonymous?: boolean
      cookie?:
        | string
        | { key: string; secret?: string | BufferSource; prefixOptions?: CookiePrefixOptions }

      headerName?: string

      verification?: VerifyOptions

      invalidCredentials?: CustomizedErrorResponseOptions
      noAuthorization?: CustomizedErrorResponseOptions
      invalidToken?: CustomizedErrorResponseOptions
    }
  | {
      jwks_uri: string | ((ctx: Context) => Promise<string> | string)
      allowAnonymous?: boolean
      cookie?:
        | string
        | { key: string; secret?: string | BufferSource; prefixOptions?: CookiePrefixOptions }

      headerName?: string

      verification?: VerifyOptions

      invalidCredentials?: CustomizedErrorResponseOptions
      noAuthorization?: CustomizedErrorResponseOptions
      invalidToken?: CustomizedErrorResponseOptions
    }

/**
 * JWK Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/jwk}
 *
 * @param {object} options - The options for the JWK middleware.
 * @param {HonoJsonWebKey[] | ((ctx: Context) => Promise<HonoJsonWebKey[]> | HonoJsonWebKey[])} [options.keys] - The public keys used for JWK verification, or a function that returns them.
 * @param {string | ((ctx: Context) => Promise<string> | string)} [options.jwks_uri] - If set to a URI string or a function that returns a URI string, attempt to fetch JWKs from it. The response must be a JSON object containing a `keys` array, which will be merged with the `keys` option.
 * @param {boolean} [options.allowAnonymous] - If set to `true`, the middleware allows requests without a token to proceed without authentication.
 * @param {string} [options.cookie] - If set, the middleware attempts to retrieve the token from a cookie with these options (optionally signed) only if no token is found in the header.
 * @param {string} [options.headerName='Authorization'] - The name of the header to look for the JWT token. Default is 'Authorization'.
 * @param {RequestInit} [init] - Optional init options for the `fetch` request when retrieving JWKS from a URI.
 * @param {VerifyOptions} [options.verification] - Additional options for JWK payload verification.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use("/auth/*", jwk({
 *   jwks_uri: (c) => `https://${c.env.authServer}/.well-known/jwks.json`,
 *   headerName: 'x-custom-auth-header', // Optional, default is 'Authorization'
 * }))
 *
 * app.get('/auth/page', (c) => {
 *   return c.text('You are authorized')
 * })
 * ```
 */
export const jwk = (options: JwkOptions, init?: RequestInit): MiddlewareHandler => {
  const verifyOpts = options.verification || {}

  if (!('keys' in options || 'jwks_uri' in options)) {
    throw new Error('JWK auth middleware requires options for either "keys" or "jwks_uri" or both')
  }

  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWK auth middleware requires it.')
  }

  return async function jwk(ctx, next) {
    const realm = ctx.req.url
    const credentials = ctx.req.header(options.headerName || HEADER)
    let token
    if (credentials) {
      const parts = credentials.split(/\s+/)
      if (parts.length !== 2) {
        const error_description = 'invalid credentials structure'
        await throwHTTPException(
          ctx,
          options.invalidCredentials?.wwwAuthenticateHeader || {
            realm,
            error: 'invalid_request',
            error_description,
          },
          options.invalidCredentials?.message || error_description
        )
      } else {
        token = parts[1]
      }
    } else if (options.cookie) {
      if (typeof options.cookie == 'string') {
        token = getCookie(ctx, options.cookie)
      } else if (options.cookie.secret) {
        if (options.cookie.prefixOptions) {
          token = await getSignedCookie(
            ctx,
            options.cookie.secret,
            options.cookie.key,
            options.cookie.prefixOptions
          )
        } else {
          token = await getSignedCookie(ctx, options.cookie.secret, options.cookie.key)
        }
      } else {
        if (options.cookie.prefixOptions) {
          token = getCookie(ctx, options.cookie.key, options.cookie.prefixOptions)
        } else {
          token = getCookie(ctx, options.cookie.key)
        }
      }
    }

    if (!token) {
      if (options.allowAnonymous) {
        return next()
      }
      await throwHTTPException(
        ctx,
        options.noAuthorization?.wwwAuthenticateHeader || {
          realm,
          error: 'invalid_request',
          error_description: 'no authorization included in request',
        },
        options.noAuthorization?.message || 'Unauthorized'
      )
    }

    let payload
    let cause
    try {
      const keys =
        'keys' in options
          ? typeof options.keys === 'function'
            ? await options.keys(ctx)
            : options.keys
          : undefined
      const jwks_uri =
        'jwks_uri' in options
          ? typeof options.jwks_uri === 'function'
            ? await options.jwks_uri(ctx)
            : options.jwks_uri
          : undefined
      payload = await Jwt.verifyWithJwks(
        token as string,
        { keys, jwks_uri, verification: verifyOpts },
        init
      )
    } catch (e) {
      cause = e
    }

    if (!payload) {
      if (cause instanceof Error && cause.constructor === Error) {
        throw cause
      }
      await throwHTTPException(
        ctx,
        options.invalidToken?.wwwAuthenticateHeader || {
          realm,
          error: 'invalid_token',
          error_description: 'token verification failure',
        },
        options.invalidToken?.message || 'Unauthorized',
        cause
      )
    }

    ctx.set('jwtPayload', payload)

    await next()
  }
}

async function throwHTTPException(
  c: Context,
  wwwAuthenticateHeader: string | object | MessageFunction,
  messageOption: string | object | MessageFunction,
  cause?: unknown
): Promise<Response> {
  const status = 401
  const headers = {
    'WWW-Authenticate':
      typeof wwwAuthenticateHeader === 'function'
        ? await wwwAuthenticateHeader(c)
        : typeof wwwAuthenticateHeader === 'string'
        ? wwwAuthenticateHeader
        : `Bearer ${Object.entries(wwwAuthenticateHeader)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',')}`,
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
  throw new HTTPException(status, { res, cause })
}
