import type { Context } from '../../context'
import { timingSafeEqual } from '../../utils/buffer'

const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/
const USER_PASS_REGEXP = /^([^:]*):(.*)$/

const auth = (req: Request) => {
  if (!req) {
    throw new TypeError('argument req is required')
  }

  if (typeof req !== 'object') {
    throw new TypeError('argument req is required to be an object')
  }

  if (!req.headers || typeof req.headers !== 'object') {
    throw new TypeError('argument req is required to have headers property')
  }

  const match = CREDENTIALS_REGEXP.exec(req.headers.get('Authorization'))
  if (!match) {
    return undefined
  }

  const userPass = USER_PASS_REGEXP.exec(decodeBase64(match[1]))

  if (!userPass) {
    return undefined
  }

  return { username: userPass[1], password: userPass[2] }
}

let b: BufferConstructor

function decodeBase64(str: string) {
  return b.from(str, 'base64').toString()
}

export const basicAuth = (options: { username: string; password: string; realm?: string }) => {
  try {
    b = Buffer
  } catch {}

  if (b === undefined) {
    try {
      const { Buffer } = require('buffer')
      b = Buffer
    } catch (e) {
      throw new Error('If you want to use Basic Auth Middleware, install "buffer" package.')
    }
  }

  if (!options.realm) {
    options.realm = 'Secure Area'
  }

  return async (ctx: Context, next: Function) => {
    const user = auth(ctx.req)
    const usernameEqual = user && (await timingSafeEqual(options.username, user.username))
    const passwordEqual = user && (await timingSafeEqual(options.password, user.password))

    if (!user || !usernameEqual || !passwordEqual) {
      ctx.res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="' + options.realm.replace(/"/g, '\\"') + '"',
        },
      })
      return
    }
    return next()
  }
}
