import type { Context } from '../../context'
import { timingSafeEqual } from '../../util'

const CREDENTIALS_REGEXP =
  /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/
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

  return { name: userPass[1], pass: userPass[2] }
}

function decodeBase64(str: string) {
  return Buffer.from(str, 'base64').toString()
}

export const basicAuth = (options: {
  name: string;
  pass: string;
  realm?: string;
}) => {
  if (!options.realm) {
    options.realm = 'Secure Area'
  }

  return async (ctx: Context, next: Function) => {
    const user = auth(ctx.req)
    const nameEqual = user && await timingSafeEqual(options.name, user.name)
    const passEqual = user && await timingSafeEqual(options.pass, user.pass)

    if (!user || !nameEqual || !passEqual) {
      ctx.res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate':
            'Basic realm="' + options.realm.replace(/"/g, '\\"') + '"',
        },
      })
      return
    }
    return next()
  }
}
