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
import type { ExtendedJsonWebKey } from '../../utils/jwt/jws'

/**
 * JWK Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/jwk}
 *
 * @param {object} options - The options for the JWK middleware.
 * @param {JsonWebKey[] | (() => Promise<JsonWebKey[]>)} [options.keys] - The values of your public keys, or a function that returns them.
 * @param {string} [options.jwks_uri] - If this value is set, attempt to fetch JWKs from this URI, expecting a JSON response with `keys` which are added to the provided options.keys
 * @param {string} [options.cookie] - If this value is set, then the value is retrieved from the cookie header using that value as a key, which is then validated as a token.
 * @param {RequestInit} [init] - Optional initialization options for the `fetch` request when retrieving JWKS from a URI.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use("/auth/*", jwk({ jwks_uri: "https://example-backend.hono.dev/.well-known/jwks.json" }))
 *
 * app.get('/auth/page', (c) => {
 *   return c.text('You are authorized')
 * })
 * ```
 */

export const jwk = (
  options: {
    keys?: ExtendedJsonWebKey[] | (() => Promise<ExtendedJsonWebKey[]>)
    jwks_uri?: string
    cookie?:
      | string
      | { key: string; secret?: string | BufferSource; prefixOptions?: CookiePrefixOptions }
  },
  init?: RequestInit
): MiddlewareHandler => {
  if (!options || !(options.keys || options.jwks_uri)) {
    throw new Error('JWK auth middleware requires options for either "keys" or "jwks_uri"')
  }

  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWK auth middleware requires it.')
  }

  return async function jwk(ctx, next) {
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
          console.log('TOK', token, options, ctx.req.raw.headers)
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
        }),
      })
    }

    let keys = typeof options.keys === 'function' ? await options.keys() : options.keys

    if (options.jwks_uri) {
      const response = await fetch(options.jwks_uri, init)
      if (!response.ok) {
        throw new Error(`failed to fetch JWKS from ${options.jwks_uri}`)
      }
      const data = (await response.json()) as { keys?: JsonWebKey[] }
      if (!data.keys) {
        throw new Error('invalid JWKS response. "keys" field is missing')
      }
      if (keys) {
        keys.push(...data.keys)
      } else {
        keys = data.keys
      }
    } else if (!keys) {
      throw new Error('JWK auth middleware requires options for either "keys" or "jwks_uri"')
    }

    let payload
    let cause
    try {
      payload = await Jwt.verifyFromJwks(token, keys)
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
