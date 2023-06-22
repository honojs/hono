import { HTTPException } from '../../http-exception.ts'
import type { HonoRequest } from '../../request.ts'
import type { MiddlewareHandler } from '../../types.ts'
import { timingSafeEqual } from '../../utils/buffer.ts'
import { decodeBase64 } from '../../utils/encode.ts'

const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/
const USER_PASS_REGEXP = /^([^:]*):(.*)$/

interface BasicAuthOptions {
  username: string
  password: string
  realm?: string
  hashFunction?: Function
}

type ShortBasicAuthOptions = Omit<BasicAuthOptions, 'realm' | 'hashFunction'>

const auth = (req: HonoRequest) => {
  const match = CREDENTIALS_REGEXP.exec(req.headers.get('Authorization') || '')

  if (!match) {
    return undefined
  }

  const utf8Decoder = new TextDecoder()
  const userPass = USER_PASS_REGEXP.exec(utf8Decoder.decode(decodeBase64(match[1])))

  if (userPass) {
    return { username: userPass[1], password: userPass[2] }
  }
}

export const basicAuth = (
  options: BasicAuthOptions,
  ...users: ShortBasicAuthOptions[]
): MiddlewareHandler => {
  const { username, password } = options
  const realm = options?.realm || 'Secure Area'

  const listedUsers = [{ username, password }, ...users]

  return async (ctx, next) => {
    const userValided = auth(ctx.req)

    if (userValided) {
      for (const user of listedUsers) {
        const usernameEqual = await timingSafeEqual(
          user.username,
          userValided.username,
          options.hashFunction
        )

        const passwordEqual = await timingSafeEqual(
          user.password,
          userValided.password,
          options.hashFunction
        )

        if (usernameEqual && passwordEqual) {
          await next()
          return
        }
      }
    }

    const res = new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="' + realm.replace(/"/g, '\\"') + '"',
      },
    })

    throw new HTTPException(401, { res })
  }
}
