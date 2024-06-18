/**
 * @module
 * JWT Auth Middleware for Hono.
 */

import type { Context } from '../../context'
import { getCookie } from '../../helper/cookie'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import { Jwt } from '../../utils/jwt'
import '../../context'
import type { SignatureAlgorithm } from '../../utils/jwt/jwa'

export type JwtVariables = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jwtPayload: any
}

/**
 * JWT Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/middleware/builtin/jwt}
 *
 * @param {object} options - The options for the JWT middleware.
 * @param {string} [options.secret] - A value of your secret key.
 * @param {string} [options.cookie] - If this value is set, then the value is retrieved from the cookie header using that value as a key, which is then validated as a token.
 * @param {SignatureAlgorithm} [options.alg=HS256] - An algorithm type that is used for verifying. Available types are `HS256` | `HS384` | `HS512` | `RS256` | `RS384` | `RS512` | `PS256` | `PS384` | `PS512` | `ES256` | `ES384` | `ES512` | `EdDSA`.
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
 *   })
 * )
 *
 * app.get('/auth/page', (c) => {
 *   return c.text('You are authorized')
 * })
 * ```
 */
export const jwt = (options: {
  secret: string
  cookie?: string
  alg?: SignatureAlgorithm
}): MiddlewareHandler => {
  if (!options || !options.secret) {
    throw new Error('JWT auth middleware requires options for "secret"')
  }

  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }

  return async function jwt(ctx, next) {
    const credentials = ctx.req.raw.headers.get('Authorization')
    let token
    if (credentials) {
      const parts = credentials.split(/\s+/)
      if (parts.length !== 2) {
        const errDescription = 'invalid credentials structure'
        throw new HTTPException(401, {
          message: errDescription,
          res: unauthorizedResponse({
            ctx,
            error: 'invalid_request',
            errDescription,
          }),
        })
      } else {
        token = parts[1]
      }
    } else if (options.cookie) {
      token = getCookie(ctx)[options.cookie]
    }

    if (!token) {
      const errDescription = 'no authorization included in request'
      throw new HTTPException(401, {
        message: errDescription,
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_request',
          errDescription,
        }),
      })
    }

    let payload
    let cause
    try {
      payload = await Jwt.verify(token, options.secret, options.alg)
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
}) {
  return new Response('Unauthorized', {
    status: 401,
    statusText: opts.statusText,
    headers: {
      'WWW-Authenticate': `Bearer realm="${opts.ctx.req.url}",error="${opts.error}",error_description="${opts.errDescription}"`,
    },
  })
}

export const verify = Jwt.verify
export const decode = Jwt.decode
export const sign = Jwt.sign
