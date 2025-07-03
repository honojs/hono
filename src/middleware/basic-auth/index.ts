/**
 * @module
 * Basic Auth Middleware for Hono.
 */

import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import { auth } from '../../utils/basic-auth'
import { timingSafeEqual } from '../../utils/buffer'

type MessageFunction = (c: Context) => string | object | Promise<string | object>

type BasicAuthOptions =
  | {
      username: string
      password: string
      realm?: string
      hashFunction?: Function
      invalidUserMessage?: string | object | MessageFunction
    }
  | {
      verifyUser: (username: string, password: string, c: Context) => boolean | Promise<boolean>
      realm?: string
      hashFunction?: Function
      invalidUserMessage?: string | object | MessageFunction
    }

/**
 * Basic Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/basic-auth}
 *
 * @param {BasicAuthOptions} options - The options for the basic authentication middleware.
 * @param {string} options.username - The username for authentication.
 * @param {string} options.password - The password for authentication.
 * @param {string} [options.realm="Secure Area"] - The realm attribute for the WWW-Authenticate header.
 * @param {Function} [options.hashFunction] - The hash function used for secure comparison.
 * @param {Function} [options.verifyUser] - The function to verify user credentials.
 * @param {string | object | MessageFunction} [options.invalidUserMessage="Unauthorized"] - The invalid user message.
 * @returns {MiddlewareHandler} The middleware handler function.
 * @throws {HTTPException} If neither "username and password" nor "verifyUser" options are provided.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(
 *   '/auth/*',
 *   basicAuth({
 *     username: 'hono',
 *     password: 'ahotproject',
 *   })
 * )
 *
 * app.get('/auth/page', (c) => {
 *   return c.text('You are authorized')
 * })
 * ```
 */
export const basicAuth = (
  options: BasicAuthOptions,
  ...users: { username: string; password: string }[]
): MiddlewareHandler => {
  const usernamePasswordInOptions = 'username' in options && 'password' in options
  const verifyUserInOptions = 'verifyUser' in options

  if (!(usernamePasswordInOptions || verifyUserInOptions)) {
    throw new Error(
      'basic auth middleware requires options for "username and password" or "verifyUser"'
    )
  }

  if (!options.realm) {
    options.realm = 'Secure Area'
  }

  if (!options.invalidUserMessage) {
    options.invalidUserMessage = 'Unauthorized'
  }

  if (usernamePasswordInOptions) {
    users.unshift({ username: options.username, password: options.password })
  }

  return async function basicAuth(ctx, next) {
    const requestUser = auth(ctx.req.raw)
    if (requestUser) {
      if (verifyUserInOptions) {
        if (await options.verifyUser(requestUser.username, requestUser.password, ctx)) {
          await next()
          return
        }
      } else {
        for (const user of users) {
          const [usernameEqual, passwordEqual] = await Promise.all([
            timingSafeEqual(user.username, requestUser.username, options.hashFunction),
            timingSafeEqual(user.password, requestUser.password, options.hashFunction),
          ])
          if (usernameEqual && passwordEqual) {
            await next()
            return
          }
        }
      }
    }
    // Invalid user.
    const status = 401
    const headers = {
      'WWW-Authenticate': 'Basic realm="' + options.realm?.replace(/"/g, '\\"') + '"',
    }
    const responseMessage =
      typeof options.invalidUserMessage === 'function'
        ? await options.invalidUserMessage(ctx)
        : options.invalidUserMessage
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
}
