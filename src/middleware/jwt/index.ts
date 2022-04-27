import type { Context } from '@/context'
import type { Next } from '@/hono'
import { Jwt } from '@/utils/jwt'
import type { AlgorithmTypes } from '@/utils/jwt/types'

export const jwt = (options: { secret: string; alg?: string }) => {
  if (!options) {
    throw new Error('JWT auth middleware requires options for "secret')
  }

  return async (ctx: Context, next: Next) => {
    const credentials = ctx.req.headers.get('Authorization')
    if (!credentials) {
      ctx.res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic ${options.secret}',
        },
      })
      return
    }

    const parts = credentials.split(/\s+/)
    if (parts.length !== 2) {
      ctx.res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic ${options.secret}',
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
    if (authorized) {
      return next()
    }
    ctx.res = new Response('Unauthorized', {
      status: 401,
      statusText: msg,
      headers: {
        'WWW-Authenticate': 'Bearer ${options.secret}',
      },
    })
    return
  }
}
