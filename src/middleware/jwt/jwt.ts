/**
 * @module
 * JWT Auth Middleware for Hono.
 */

import type { Context } from '../../context'
import { getCookie, getSignedCookie } from '../../helper/cookie'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import type { CookiePrefixOptions } from '../../utils/cookie'
import { Jwt } from '../../utils/jwt'
import '../../context'
import type { SignatureAlgorithm } from '../../utils/jwt/jwa'
import type { SignatureKey } from '../../utils/jwt/jws'
import type { VerifyOptions } from '../../utils/jwt/jwt'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JwtVariables<T = any> = {
  jwtPayload: T
}

const HEADER = 'Authorization'

type MessageFunction = (c: Context) => string | object | Promise<string | object>
type CustomizedErrorResponseOptions = {
  wwwAuthenticateHeader?: string | object | MessageFunction
  message?: string | object | MessageFunction
}

type JwtOptions = {
  secret: SignatureKey
  cookie?:
    | string
    | { key: string; secret?: string | BufferSource; prefixOptions?: CookiePrefixOptions }
  alg?: SignatureAlgorithm
  headerName?: string
  verification?: VerifyOptions

  invalidCredentials?: CustomizedErrorResponseOptions
  noAuthorization?: CustomizedErrorResponseOptions
  invalidToken?: CustomizedErrorResponseOptions
}

/**
 * JWT Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/jwt}
 *
 * @param {object} options - The options for the JWT middleware.
 * @param {SignatureKey} [options.secret] - A value of your secret key.
 * @param {string} [options.cookie] - If this value is set, then the value is retrieved from the cookie header using that value as a key, which is then validated as a token.
 * @param {SignatureAlgorithm} [options.alg=HS256] - An algorithm type that is used for verifying. Available types are `HS256` | `HS384` | `HS512` | `RS256` | `RS384` | `RS512` | `PS256` | `PS384` | `PS512` | `ES256` | `ES384` | `ES512` | `EdDSA`.
 * @param {string} [options.headerName='Authorization'] - The name of the header to look for the JWT token. Default is 'Authorization'.
 * @param {VerifyOptions} [options.verification] - Additional options for JWT payload verification.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(
 *   '/auth/*',
 *   jwt({
 *     secret: 'it-is-very-secret',
 *     headerName: 'x-custom-auth-header', // Optional, default is 'Authorization'
 *   })
 * )
 *
 * app.get('/auth/page', (c) => {
 *   return c.text('You are authorized')
 * })
 * ```
 */
export const jwt = (options: JwtOptions): MiddlewareHandler => {
  const verifyOpts = options.verification || {}

  if (!options || !options.secret) {
    throw new Error('JWT auth middleware requires options for "secret"')
  }

  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }

  return async function jwt(ctx, next) {
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
      payload = await Jwt.verify(token as string, options.secret, {
        alg: options.alg,
        ...verifyOpts,
      })
    } catch (e) {
      cause = e
    }
    if (!payload) {
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
  const wwwAuthenticateHeaderValue: string | object = typeof wwwAuthenticateHeader === 'function'
      ? await wwwAuthenticateHeader(c)
      : wwwAuthenticateHeader;

    const headers = {
      'WWW-Authenticate': typeof wwwAuthenticateHeaderValue === 'string'
          ? wwwAuthenticateHeaderValue
          : `Bearer ${Object.entries(wwwAuthenticateHeaderValue)
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

export const verifyWithJwks = Jwt.verifyWithJwks
export const verify = Jwt.verify
export const decode = Jwt.decode
export const sign = Jwt.sign
