import { decodeURIComponent_ } from './url.ts'

export type Cookie = Record<string, string>
export type SignedCookie = Record<string, string | false>
export type CookieOptions = {
  domain?: string
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  secure?: boolean
  signingSecret?: string
  sameSite?: 'Strict' | 'Lax' | 'None'
}

const makeSignature = async (value: string, secret: string): Promise<string> => {
  const algorithm = { name: 'HMAC', hash: 'SHA-256' }
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), algorithm, false, [
    'sign',
    'verify',
  ])
  const signature = await crypto.subtle.sign(algorithm.name, key, encoder.encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

const _parseCookiePairs = (cookie: string, name?: string): string[][] => {
  const pairs = cookie.split(/;\s*/g)
  const cookiePairs = pairs.map((pairStr: string) => pairStr.split(/\s*=\s*([^\s]+)/))
  if (!name) return cookiePairs
  return cookiePairs.filter((pair) => pair[0] === name)
}

export const parse = (cookie: string, name?: string): Cookie => {
  const parsedCookie: Cookie = {}
  const unsingedCookies = _parseCookiePairs(cookie, name).filter((pair) => {
    // ignore signed cookies, assuming they always have that commonly accepted format
    if (pair[1].split('.').length === 2) return false
    return true
  })
  for (let [key, value] of unsingedCookies) {
    value = decodeURIComponent_(value)
    parsedCookie[key] = value
  }
  return parsedCookie
}

export const parseSigned = async (
  cookie: string,
  secret: string,
  name?: string
): Promise<SignedCookie> => {
  const parsedCookie: SignedCookie = {}
  const signedCookies = _parseCookiePairs(cookie, name).filter((pair) => {
    // ignore signed cookies, assuming they always have that commonly accepted format
    if (pair[1].split('.').length !== 2) return false
    return true
  })
  for (let [key, value] of signedCookies) {
    value = decodeURIComponent_(value)
    const signedPair = value.split('.')
    const signatureToCompare = await makeSignature(signedPair[0], secret)
    if (signedPair[1] !== signatureToCompare) {
      // cookie will be undefined when using getCookie
      parsedCookie[key] = false
      continue
    }
    parsedCookie[key] = signedPair[0]
  }
  return parsedCookie
}

const _serialize = (name: string, value: string, opt: CookieOptions = {}): string => {
  let cookie = `${name}=${value}`

  if (opt && typeof opt.maxAge === 'number' && opt.maxAge >= 0) {
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

export const serialize = (name: string, value: string, opt: CookieOptions = {}): string => {
  value = encodeURIComponent(value)
  return _serialize(name, value, opt)
}

export const serializeSigned = async (
  name: string,
  value: string,
  secret: string,
  opt: CookieOptions = {}
): Promise<string> => {
  const signature = await makeSignature(value, secret)
  value = `${value}.${signature}`
  value = encodeURIComponent(value)
  return _serialize(name, value, opt)
}
