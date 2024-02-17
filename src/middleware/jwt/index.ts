import type { Context } from '../../context'
import { getCookie } from '../../helper/cookie'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import { Jwt } from '../../utils/jwt'
import type { AlgorithmTypes } from '../../utils/jwt/types'
import '../../context'

declare module '../../context' {
  interface ContextVariableMap {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwtPayload: any
  }
}

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

  return async function jwt(ctx, next) {
    const credentials = ctx.req.raw.headers.get('Authorization')
    let token
    if (credentials) {
      const parts = credentials.split(/\s+/)
      if (parts.length !== 2) {
        throw new HTTPException(401, {
          res: unauthorizedResponse({
            ctx,
            error: 'invalid_request',
            errDescription: 'invalid credentials structure',
          }),
        })
      } else {
        token = parts[1]
      }
    } else if (options.cookie) {
      token = getCookie(ctx)[options.cookie]
    }

    if (!token) {
      throw new HTTPException(401, {
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_request',
          errDescription: 'no authorization included in request',
        }),
      })
    }

    let payload
    let msg = ''
    try {
      payload = await Jwt.verify(token, options.secret, options.alg as AlgorithmTypes)
    } catch (e) {
      msg = `${e}`
    }
    if (!payload) {
      throw new HTTPException(401, {
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_token',
          statusText: msg,
          errDescription: 'token verification failure',
        }),
      })
    }

    ctx.set('jwtPayload', payload)

    await next()
  }
}

function unauthorizedResponse(opts: {
  ctx: Context
  error: string
  errDescription: string
  statusText?: string
}) {
  return new Response('Unauthorized', {
    status: 401,
    statusText: opts.statusText,
    headers: {
      'WWW-Authenticate': `Bearer realm="${opts.ctx.req.url}",error="${opts.error}",error_description="${opts.errDescription}"`,
    },
  })
}

export const verify = Jwt.verify
export const decode = Jwt.decode
export const sign = Jwt.sign
