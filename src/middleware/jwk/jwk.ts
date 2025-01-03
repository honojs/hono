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
import { decodeHeader } from '../../utils/jwt/jwt'

/**
 * JWK Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/jwk}
 *
 * @param {object} options - The options for the JWK middleware.
 * @param {SignatureKey} [options.keys] - The values of your public keys.
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
 *   jwk({
 *     keys: [
 *      {
 *        "kid": "zD3EXVUWK1cPcrs0k8jYby453Emkirs91m7J9asbzrw",
 *        "kty": "RSA",
 *        "use": "sig",
 *        "alg": "RS256",
 *        "e": "AQAB",
 *        "n": "uj53NGvSENC2Ld0-5aNyv5tPJqBDJmZzn0-ApRv8sKk6sdiimikaL8EQpfLOuU3imIC9bPELC6XdqYzAsWOikJZj2Ddt2fqMzNe8EvDOaRdZPnqsjoNQCbz35WXfZLRPizIUSikIGG9itpYzUSAbkfRaQmpjdn_lugHWHlTT8HgtX2WLhloDfEdR9XjoVAFUtNgG7rH-pOF2d3dpI5tfs56JKl7zSTSk6jRIMBmH3X-uPg9j4UivH4aZmpisz_aOYSLbXsMxe4sFRxkcCU893zURSlNiQvPSEnGiJUdCrNF40Oo_eTGR6LQRs3uqdYC1rguQwTzaDCxg2M-ikKciAw",
 *      },
 *      {
 *        "kid": "rnfK5u1_mb11C1sxFOZpIxFIjEnptL_faUqKPPWvWPE",
 *        "kty": "RSA",
 *        "use": "sig",
 *        "alg": "RS256",
 *        "e": "AQAB",
 *        "n": "pF41Z9B9sp5nu2nkeGPOWokb2FD55wrriS62vdGp2jXMJvONK9YP5uiQX2DrtgVorwUgeQhJMbF4LerkU4w0zpzZcXEGQeFFs8mGchETbsVtnfH7zJcb6T5oQYsqNVExV0qLrEilQ8OLFRmT1d2EKKeJ7-V4VUjHcii0X9WFgpyBnVnM7k5RpoXRd0g8jKEhfPKMzSKHKTHitM_7pjadv1Wl_r7yiM4J1ULswBNaXpEJhbbKfWstGHpWA4AWjDc5kYe92J1qYIxbRkfJ53TIchDjldP3DlHXoUvoZLDzenklIJFB9k6_901uBviU72OulV96vnaM1SueMVDhq8R8ow",
 *      }
 *     ],
 *   })
 * )
 *
 * app.get('/auth/page', (c) => {
 *   return c.text('You are authorized')
 * })
 * ```
 */

// Extending the JsonWebKey interface to include the "kid" property through declaration merging.
// https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.4
declare global {
  interface JsonWebKey {
    kid?: string;
  }
}

export const jwk = (options: ({ keys?: JsonWebKey[] | (() => Promise<JsonWebKey[]>), jwks_uri?: string }) & {
  cookie?:
    | string
    | { key: string; secret?: string | BufferSource; prefixOptions?: CookiePrefixOptions }
}, init?: RequestInit): MiddlewareHandler => {
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

    let _keys = typeof options.keys === 'function' ? await options.keys() : options.keys

    if (options.jwks_uri) {
      const response = await fetch(options.jwks_uri, init)
      if (!response.ok) {
        throw new Error(`failed to fetch JWKS from ${options.jwks_uri}`)
      }
      const data = await response.json() as { keys?: JsonWebKey[] }
      if (!data.keys) {
        throw new Error('invalid JWKS response. "keys" field is missing')
      }
      if (_keys) {
        _keys.push(...data.keys)
      } else {
        _keys = data.keys
      }
    } else if (!_keys) {
        throw new Error('JWK auth middleware requires options for either "keys" or "jwks_uri"')
    }

    let header
    try {
      header = decodeHeader(token)
    } catch (e) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_token',
          statusText: 'Unauthorized',
          errDescription: 'token verification failure',
        }),
        cause: e,
      })
    }

    if (!header.kid) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_token',
          statusText: 'Unauthorized',
          errDescription: 'token verification failure',
        }),
        cause: new Error(`missing "kid" in JWT header`),
      })
    }

    const kid = header.kid
    const matchingKey = _keys.find((key) => key.kid === kid)
    if (!matchingKey) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_token',
          statusText: 'Unauthorized',
          errDescription: 'token verification failure',
        }),
        cause: new Error(`unmatched "kid" in JWT header`),
      })
    }

    let payload
    let cause
    try {
      payload = await Jwt.verify(token, matchingKey, matchingKey.alg as any)
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