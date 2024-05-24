import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { HonoRequest } from '../../request'
import type { MiddlewareHandler } from '../../types'
import { timingSafeEqual } from '../../utils/buffer'
import { decodeBase64 } from '../../utils/encode'

const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/
const USER_PASS_REGEXP = /^([^:]*):(.*)$/
const utf8Decoder = new TextDecoder()
const auth = (req: HonoRequest) => {
  const match = CREDENTIALS_REGEXP.exec(req.header('Authorization') || '')
  if (!match) {
    return undefined
  }

  let userPass = undefined
  // If an invalid string is passed to atob(), it throws a `DOMException`.
  try {
    userPass = USER_PASS_REGEXP.exec(utf8Decoder.decode(decodeBase64(match[1])))
  } catch {} // Do nothing

  if (!userPass) {
    return undefined
  }

  return { username: userPass[1], password: userPass[2] }
}

type BasicAuthOptions =
  | {
      username: string
      password: string
      realm?: string
      hashFunction?: Function
    }
  | {
      verifyUser: (username: string, password: string, c: Context) => boolean | Promise<boolean>
      realm?: string
      hashFunction?: Function
    }

/**
 * Basic authentication middleware for Hono.
 *
 * @see {@link https://hono.dev/middleware/builtin/basic-auth}
 *
 * @param {BasicAuthOptions} options - The options for the basic authentication middleware.
 * @param {string} options.username - The username for authentication.
 * @param {string} options.password - The password for authentication.
 * @param {string} [options.realm="Secure Area"] - The realm attribute for the WWW-Authenticate header.
 * @param {Function} [options.hashFunction] - The hash function used for secure comparison.
 * @param {Function} [options.verifyUser] - The function to verify user credentials.
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
 *     password: 'acoolproject',
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

  if (usernamePasswordInOptions) {
    users.unshift({ username: options.username, password: options.password })
  }

  return async function basicAuth(ctx, next) {
    const requestUser = auth(ctx.req)
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
    const res = new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="' + options.realm?.replace(/"/g, '\\"') + '"',
      },
    })
    throw new HTTPException(401, { res })
  }
}
