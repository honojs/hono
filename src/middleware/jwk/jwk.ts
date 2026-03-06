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
import type { AsymmetricAlgorithm } from '../../utils/jwt/jwa'
import type { HonoJsonWebKey } from '../../utils/jwt/jws'
import type { VerifyOptions } from '../../utils/jwt/jwt'

/**
 * JWK Auth Middleware for Hono.
 *
 * This middleware handles JWT validation using JSON Web Keys (JWKs). Here's what you need to know
 * about what gets validated automatically and what you'll need to handle in your application code.
 *
 * ## What the middleware validates automatically:
 *
 * The middleware takes care of these validations out of the box:
 * - **Token structure** - Makes sure your JWT has the correct format (header.payload.signature)
 * - **Signature verification** - Validates the cryptographic signature using the JWK that matches the `kid` in the token header
 * - **Token expiration (`exp`)** - Checks that the token hasn't expired (enabled by default, but you can disable it)
 * - **Not before (`nbf`)** - Ensures the token isn't being used before it's valid (also on by default)
 * - **Issued at (`iat`)** - Verifies the token wasn't issued in the future (yep, enabled by default too)
 * - **Header checks** - Validates that `alg` is supported, `typ` is 'JWT' (when present), and `kid` exists and matches a key
 *
 * ## Optional validations (you need to configure these):
 *
 * These aren't checked unless you explicitly provide them in the options:
 * - **Issuer (`iss`)** - Set `verification.iss` to validate who issued the token (can be a string or RegExp)
 * - **Audience (`aud`)** - Set `verification.aud` to verify the intended recipient (string, array, or RegExp)
 *
 * ## What YOU need to validate yourself:
 *
 * Important: The middleware only handles authentication (verifying the token is valid). 
 * Authorization is your responsibility! You'll need to check:
 * - Custom claims like `roles`, `permissions`, `scope`, `user_id`, etc.
 * - Whether the user actually has permission to access the resource
 * - Token revocation status (if your auth system supports it)
 * - Rate limiting per user/token if needed
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/jwk}
 *
 * @param {object} options - The options for the JWK middleware.
 * @param {HonoJsonWebKey[] | ((ctx: Context) => Promise<HonoJsonWebKey[]> | HonoJsonWebKey[])} [options.keys] - The public keys used for JWK verification, or a function that returns them.
 * @param {string | ((ctx: Context) => Promise<string> | string)} [options.jwks_uri] - If set to a URI string or a function that returns a URI string, attempt to fetch JWKs from it. The response must be a JSON object containing a `keys` array, which will be merged with the `keys` option.
 * @param {boolean} [options.allow_anon] - If set to `true`, the middleware allows requests without a token to proceed without authentication.
 * @param {string} [options.cookie] - If set, the middleware attempts to retrieve the token from a cookie with these options (optionally signed) only if no token is found in the header.
 * @param {string} [options.headerName='Authorization'] - The name of the header to look for the JWT token. Default is 'Authorization'.
 * @param {AsymmetricAlgorithm[]} options.alg - An array of allowed asymmetric algorithms for JWT verification. Only tokens signed with these algorithms will be accepted.
 * @param {RequestInit} [init] - Optional init options for the `fetch` request when retrieving JWKS from a URI.
 * @param {VerifyOptions} [options.verification] - Additional options for JWK payload verification.
 * @param {string|RegExp} [options.verification.iss] - Expected issuer value to validate against the `iss` claim.
 * @param {string|string[]|RegExp} [options.verification.aud] - Expected audience(s) to validate against the `aud` claim.
 * @param {boolean} [options.verification.exp=true] - Set to false to skip expiration validation. Default: true
 * @param {boolean} [options.verification.nbf=true] - Set to false to skip not-before validation. Default: true
 * @param {boolean} [options.verification.iat=true] - Set to false to skip issued-at validation. Default: true
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * // Basic example - the middleware will validate signature, exp, nbf, and iat
 * const app = new Hono()
 *
 * app.use('/auth/*', jwk({
 *   jwks_uri: 'https://your-auth-server.com/.well-known/jwks.json'
 * }))
 *
 * app.get('/auth/page', (c) => {
 *   return c.text('You are authorized')
 * })
 * ```
 *
 * @example
 * ```ts
 * // Adding issuer and audience validation
 * app.use('/api/*', jwk({
 *   jwks_uri: 'https://your-auth-server.com/.well-known/jwks.json',
 *   verification: {
 *     iss: 'https://your-auth-server.com',
 *     aud: 'your-api-identifier'
 *   }
 * }))
 * ```
 *
 * @example
 * ```ts
 * // How to check custom claims like roles or permissions
 * app.use('/admin/*', jwk({
 *   jwks_uri: 'https://your-auth-server.com/.well-known/jwks.json'
 * }))
 *
 * app.get('/admin/dashboard', (c) => {
 *   const payload = c.get('jwtPayload')
 *
 *   // The middleware doesn't validate custom claims - you need to do this yourself
 *   if (!payload.roles || !payload.roles.includes('admin')) {
 *     throw new HTTPException(403, { message: 'Forbidden: Admin role required' })
 *   }
 *
 *   return c.json({ message: 'Welcome, admin!' })
 * })
 * ```
 *
 * @example
 * ```ts
 * // You can also use dynamic JWKS URIs based on the request context
 * app.use('/tenant/:tenant/*', jwk({
 *   jwks_uri: (c) => {
 *     const tenant = c.req.param('tenant')
 *     return `https://${tenant}.auth.example.com/.well-known/jwks.json`
 *   }
 * }))
 * ```
 */

export const jwk = (
  options: {
    keys?: HonoJsonWebKey[] | ((ctx: Context) => Promise<HonoJsonWebKey[]> | HonoJsonWebKey[])
    jwks_uri?: string | ((ctx: Context) => Promise<string> | string)
    allow_anon?: boolean
    cookie?:
      | string
      | { key: string; secret?: string | BufferSource; prefixOptions?: CookiePrefixOptions }

    headerName?: string

    alg: AsymmetricAlgorithm[]

    verification?: VerifyOptions
  },
  init?: RequestInit
): MiddlewareHandler => {
  const verifyOpts = options.verification || {}

  if (!options || !(options.keys || options.jwks_uri)) {
    throw new Error('JWK auth middleware requires options for either "keys" or "jwks_uri" or both')
  }

  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWK auth middleware requires it.')
  }

  return async function jwk(ctx, next) {
    const headerName = options.headerName || 'Authorization'

    const credentials = ctx.req.raw.headers.get(headerName)
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
      if (options.allow_anon) {
        return next()
      }
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
      const keys = typeof options.keys === 'function' ? await options.keys(ctx) : options.keys
      const jwks_uri =
        typeof options.jwks_uri === 'function' ? await options.jwks_uri(ctx) : options.jwks_uri
      payload = await Jwt.verifyWithJwks(
        token,
        { keys, jwks_uri, verification: verifyOpts, allowedAlgorithms: options.alg },
        init
      )
    } catch (e) {
      cause = e
    }

    if (!payload) {
      if (cause instanceof Error && cause.constructor === Error) {
        throw cause
      }
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
