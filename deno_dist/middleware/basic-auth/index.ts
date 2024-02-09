import { HTTPException } from '../../http-exception.ts'
import type { HonoRequest } from '../../request.ts'
import type { MiddlewareHandler } from '../../types.ts'
import { timingSafeEqual } from '../../utils/buffer.ts'
import { decodeBase64 } from '../../utils/encode.ts'

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

export const basicAuth = (
  options: { username: string; password: string; realm?: string; hashFunction?: Function },
  ...users: { username: string; password: string }[]
): MiddlewareHandler => {
  if (!options) {
    throw new Error('basic auth middleware requires options for "username and password"')
  }

  if (!options.realm) {
    options.realm = 'Secure Area'
  }
  users.unshift({ username: options.username, password: options.password })

  return async function basicAuth(ctx, next) {
    const requestUser = auth(ctx.req)
    if (requestUser) {
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
    const res = new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="' + options.realm?.replace(/"/g, '\\"') + '"',
      },
    })
    throw new HTTPException(401, { res })
  }
}
