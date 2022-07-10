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

export const parse = (cookie: string): Cookie => {
  const pairs = cookie.split(/;\s*/g)
  const parsedCookie: Cookie = {}
  for (let i = 0, len = pairs.length; i < len; i++) {
    const pair = pairs[i].split(/\s*=\s*([^\s]+)/)
    parsedCookie[pair[0]] = decodeURIComponent(pair[1])
  }
  return parsedCookie
}

export const serialize = (name: string, value: string, opt: CookieOptions = {}): string => {
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
