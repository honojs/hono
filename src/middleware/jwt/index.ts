import type { Context } from '../../context'
import type { Next } from '../../hono'
import { Jwt } from '../../utils/jwt'
import type { AlgorithmTypes } from '../../utils/jwt/types'

export const jwt = (options: { secret: string; alg?: string }) => {
  if (!options) {
    throw new Error('JWT auth middleware requires options for "secret')
  }

  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }

  return async (ctx: Context, next: Next) => {
    const credentials = ctx.req.headers.get('Authorization')

    if (!credentials) {
      ctx.res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': `Bearer realm="${ctx.req.url}",error="invalid_request",error_description="no authorization included in request"`,
        },
      })
      return
    }

    const parts = credentials.split(/\s+/)
    if (parts.length !== 2) {
      ctx.res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': `Bearer realm="${ctx.req.url}",error="invalid_request",error_description="no authorization included in request"`,
        },
      })
      return
    }

    let authorized = false
    let msg = ''
    try {
      authorized = await Jwt.verify(parts[1], options.secret, options.alg as AlgorithmTypes)
    } catch (e) {
      msg = `${e}`
    }
    if (!authorized) {
      ctx.res = new Response('Unauthorized', {
        status: 401,
        statusText: msg,
        headers: {
          'WWW-Authenticate': `Bearer realm="${ctx.req.url}",error="invalid_token",error_description="token verification failure"`,
        },
      })
      return
    }

    await next()
  }
}
