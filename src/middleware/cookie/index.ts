import type { Context } from '../../context'
import type { Next } from '../../hono'

declare global {
  interface Request {
    cookie: {
      (name: string): string
      (): Record<string, string>
    }
  }
}

declare module '../../context' {
  interface Context {
    cookie: (name: string, value: string, options?: CookieOptions) => void
  }
}

export type Cookie = Record<string, string>
export type CookieOptions = {
  domain?: string
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  secure?: boolean
  signed?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

export const cookie = () => {
  return async (c: Context, next: Next) => {
    c.req.cookie = ((name?: string): string | Record<string, string> => {
      const cookie = c.req.headers.get('Cookie')
      const obj = parse(cookie)
      if (name) {
        const value = obj[name]
        return value
      } else {
        return obj
      }
    }) as typeof c.req.cookie
    c.cookie = (name: string, value: string, opt?: CookieOptions) => {
      const cookie = serialize(name, value, opt)
      c.header('Set-Cookie', cookie)
    }
    await next()
  }
}

const parse = (cookie: string): Cookie => {
  const pairs = cookie.split(/;\s*/g)
  const parsedCookie: Cookie = {}
  for (let i = 0, len = pairs.length; i < len; i++) {
    const pair = pairs[i].split(/\s*=\s*([^\s]+)/)
    parsedCookie[pair[0]] = decodeURIComponent(pair[1])
  }
  return parsedCookie
}

const serialize = (name: string, value: string, opt: CookieOptions = {}): string => {
  value = encodeURIComponent(value)
  let cookie = `${name}=${value}`

  if (opt.maxAge) {
    cookie += `; Max-Age=${Math.floor(opt.maxAge)}`
  }

  if (opt.domain) {
    cookie += '; Domain=' + opt.domain
  }

  if (opt.path) {
    cookie += '; Path=' + opt.path
  }

  if (opt.expires) {
    cookie += '; Expires=' + opt.expires.toUTCString()
  }

  if (opt.httpOnly) {
    cookie += '; HttpOnly'
  }

  if (opt.secure) {
    cookie += '; Secure'
  }

  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite}`
  }

  return cookie
}
