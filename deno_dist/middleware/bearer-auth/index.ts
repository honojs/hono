import { HTTPException } from '../../http-exception.ts'
import type { MiddlewareHandler } from '../../types.ts'
import { timingSafeEqual } from '../../utils/buffer.ts'

const TOKEN_STRINGS = '[A-Za-z0-9._~+/-]+=*'
const PREFIX = 'Bearer'

export const bearerAuth = (options: {
  token: string | string[]
  realm?: string
  prefix?: string
  hashFunction?: Function
}): MiddlewareHandler => {
  if (!options.token) {
    throw new Error('bearer auth middleware requires options for "token"')
  }
  if (!options.realm) {
    options.realm = ''
  }
  if (!options.prefix) {
    options.prefix = PREFIX
  }

  const realm = options.realm?.replace(/"/g, '\\"')

  return async function bearerAuth(c, next) {
    const headerToken = c.req.header('Authorization')

    if (!headerToken) {
      // No Authorization header
      const res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': `${options.prefix} realm="` + realm + '"',
        },
      })
      throw new HTTPException(401, { res })
    } else {
      const regexp = new RegExp('^' + options.prefix + ' +(' + TOKEN_STRINGS + ') *$')
      const match = regexp.exec(headerToken)
      if (!match) {
        // Invalid Request
        const res = new Response('Bad Request', {
          status: 400,
          headers: {
            'WWW-Authenticate': `${options.prefix} error="invalid_request"`,
          },
        })
        throw new HTTPException(400, { res })
      } else {
        let equal = false
        if (typeof options.token === 'string') {
          equal = await timingSafeEqual(options.token, match[1], options.hashFunction)
        } else if (Array.isArray(options.token) && options.token.length > 0) {
          for (const token of options.token) {
            if (await timingSafeEqual(token, match[1], options.hashFunction)) {
              equal = true
              break
            }
          }
        }
        if (!equal) {
          // Invalid Token
          const res = new Response('Unauthorized', {
            status: 401,
            headers: {
              'WWW-Authenticate': `${options.prefix} error="invalid_token"`,
            },
          })
          throw new HTTPException(401, { res })
        }
      }
    }
    await next()
  }
}
