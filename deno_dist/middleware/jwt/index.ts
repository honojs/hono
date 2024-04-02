import type { Context } from '../../context.ts'
import { getCookie } from '../../helper/cookie/index.ts'
import { HTTPException } from '../../http-exception.ts'
import type { MiddlewareHandler } from '../../types.ts'
import { Jwt } from '../../utils/jwt/index.ts'
import '../../context.ts'
import type { SignatureAlgorithm } from '../../utils/jwt/jwa.ts'

declare module '../../context.ts' {
  interface ContextVariableMap {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwtPayload: any
  }
}

export const jwt = (options: {
  secret: string
  cookie?: string
  alg?: SignatureAlgorithm
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
        const errDescription = 'invalid credentials structure'
        throw new HTTPException(401, {
          message: errDescription,
          res: unauthorizedResponse({
            ctx,
            error: 'invalid_request',
            errDescription,
          }),
        })
      } else {
        token = parts[1]
      }
    } else if (options.cookie) {
      token = getCookie(ctx)[options.cookie]
    }

    if (!token) {
      const errDescription = 'no authorization included in request'
      throw new HTTPException(401, {
        message: errDescription,
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_request',
          errDescription,
        }),
      })
    }

    let payload
    let cause
    try {
      payload = await Jwt.verify(token, options.secret, options.alg)
    } catch (e) {
      cause = e
    }
    if (!payload) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        res: unauthorizedResponse({
          ctx,
          error: 'invalid_token',
          statusText: 'Unauthorized',
          errDescription: 'token verification failure',
        }),
        cause,
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
