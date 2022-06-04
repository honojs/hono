import type { Context } from '../../context'
import type { Next } from '../../hono'
import { timingSafeEqual } from '../../utils/buffer'

const TOKEN_REGEXP = /^Bearer ([A-Za-z0-9._~+/-]+=*) *$/

export const bearerAuth = (options: { token: string; realm?: string; hashFunction?: Function }) => {
  if (!options.token) {
    throw new Error('bearer auth middleware requires options for "token"')
  }
  if (!options.realm) {
    options.realm = ''
  }

  const realm = options.realm?.replace(/"/g, '\\"')

  return async (c: Context, next: Next) => {
    const headerToken = c.req.headers.get('Authorization')

    if (!headerToken) {
      // No Authorization header
      c.res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="' + realm + '"',
        },
      })
    } else {
      const match = TOKEN_REGEXP.exec(headerToken)
      if (!match) {
        // Invalid Request
        c.res = new Response('Bad Request', {
          status: 400,
          headers: {
            'WWW-Authenticate': 'Bearer error="invalid_request"',
          },
        })
      } else {
        const equal = await timingSafeEqual(options.token, match[1], options.hashFunction)
        if (!equal) {
          // Invalid Token
          c.res = new Response('Unauthorized', {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer error="invalid_token"',
            },
          })
        } else {
          // Authorize OK
          await next()
          return
        }
      }
    }
  }
}
