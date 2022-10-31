import type { MiddlewareHandler } from '../../types.ts'
import { Jwt } from '../../utils/jwt/index.ts'
import type { AlgorithmTypes } from '../../utils/jwt/types.ts'

export const jwt = (options: {
  secret: string
  cookie?: string
  alg?: string
}): MiddlewareHandler => {
  if (!options) {
    throw new Error('JWT auth middleware requires options for "secret')
  }

  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }

  return async (ctx, next) => {
    const credentials = ctx.req.headers.get('Authorization')
    let token
    if (credentials) {
      const parts = credentials.split(/\s+/)
      if (parts.length !== 2) {
        return new Response('Unauthorized', {
          status: 401,
          headers: {
            'WWW-Authenticate': `Bearer realm="${ctx.req.url}",error="invalid_request",error_description="invalid credentials structure"`,
          },
        })
      } else {
        token = parts[1]
      }
    } else if (options.cookie) {
      token = ctx.req.cookie(options.cookie)
    }

    if (!token) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': `Bearer realm="${ctx.req.url}",error="invalid_request",error_description="no authorization included in request"`,
        },
      })
    }

    let authorized = false
    let msg = ''
    try {
      authorized = await Jwt.verify(token, options.secret, options.alg as AlgorithmTypes)
    } catch (e) {
      msg = `${e}`
    }
    if (!authorized) {
      return new Response('Unauthorized', {
        status: 401,
        statusText: msg,
        headers: {
          'WWW-Authenticate': `Bearer realm="${ctx.req.url}",error="invalid_token",error_description="token verification failure"`,
        },
      })
    }

    await next()
  }
}
