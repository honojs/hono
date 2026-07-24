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

/**
 * JWT Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/jwt}
 *
 * @param {object} options - The options for the JWT middleware.
 * @param {SignatureKey} options.secret - A value of your secret key.
 * @param {string} [options.cookie] - If this value is set, then the value is retrieved from the cookie header using that value as a key, which is then validated as a token.
 * @param {SignatureAlgorithm} options.alg - An algorithm type that is used for verifying (required). Available types are `HS256` | `HS384` | `HS512` | `RS256` | `RS384` | `RS512` | `PS256` | `PS384` | `PS512` | `ES256` | `ES384` | `ES512` | `EdDSA`.
 * @param {string} [options.headerName='Authorization'] - The name of the header to look for the JWT token. Default is 'Authorization'.
 * @param {string} [options.realm] - The protection space described by the `realm` parameter of the returned `WWW-Authenticate` challenge header. Defaults to the request URL.
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
 *     alg: 'HS256',
 *     headerName: 'x-custom-auth-header', // Optional, default is 'Authorization'
 *   })
 * )
 *
 * app.get('/auth/page', (c) => {
 *   return c.text('You are authorized')
 * })
 * ```
 */
export const jwt = (options: {
  secret: SignatureKey
  cookie?:
    | string
    | { key: string; secret?: string | BufferSource; prefixOptions?: CookiePrefixOptions }
  alg: SignatureAlgorithm
  headerName?: string
  realm?: string
  verification?: VerifyOptions
}): MiddlewareHandler => {
  const verifyOpts = options.verification || {}

  if (!options || !options.secret) {
    throw new Error('JWT auth middleware requires options for "secret"')
  }

  if (!options.alg) {
    throw new Error('JWT auth middleware requires options for "alg"')
  }

  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }

  return async function jwt(ctx, next) {
    const headerName = options.headerName || 'Authorization'

    const credentials = ctx.req.raw.headers.get(headerName)
    let token
    if (credentials) {
      const parts = credentials.split(/\s+/)
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        const errDescription = 'invalid credentials structure'
        throw new HTTPException(401, {
          message: errDescription,
          res: unauthorizedResponse({
            ctx,
            error: 'invalid_request',
            errDescription,
            realm: options.realm,
          }),
        })
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
      const errDescription = 'no authorization included in request'
      throw new HTTPException(401, {
        message: errDescription,
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_request',
          errDescription,
          realm: options.realm,
        }),
      })
    }

    let payload
    let cause
    try {
      payload = await Jwt.verify(token, options.secret, {
        alg: options.alg,
        ...verifyOpts,
      })
    } catch (e) {
      cause = e
    }
    if (!payload) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_token',
          statusText: 'Unauthorized',
          errDescription: 'token verification failure',
          realm: options.realm,
        }),
        cause,
      })
    }

    ctx.set('jwtPayload', payload)

    await next()
  }
}

function unauthorizedResponse(opts: {
  ctx: Context
  error: string
  errDescription: string
  statusText?: string
  realm?: string
}) {
  // `realm` and `error_description` end up inside a quoted-string, so any `"`
  // they contain has to be escaped or the header is cut short. Same handling as
  // the bearer-auth middleware.
  const realm = (opts.realm ?? opts.ctx.req.url).replace(/"/g, '\\"')
  const errDescription = opts.errDescription.replace(/"/g, '\\"')

  return new Response('Unauthorized', {
    status: 401,
    statusText: opts.statusText,
    headers: {
      'WWW-Authenticate': `Bearer realm="${realm}",error="${opts.error}",error_description="${errDescription}"`,
    },
  })
}

export const verifyWithJwks = Jwt.verifyWithJwks
export const verify = Jwt.verify
export const decode = Jwt.decode
export const sign = Jwt.sign
