import type { Context } from '../../context.ts'
import { parse, parseSigned, serialize, serializeSigned } from '../../utils/cookie.ts'
import type { CookieOptions, Cookie, SignedCookie } from '../../utils/cookie.ts'

interface GetCookie {
  (c: Context, key: string): string | undefined
  (c: Context): Cookie
}

interface GetSignedCookie {
  (c: Context, secret: string | BufferSource, key: string): Promise<string | undefined | false>
  (c: Context, secret: string): Promise<SignedCookie>
}

export const getCookie: GetCookie = (c, key?) => {
  const cookie = c.req.raw.headers.get('Cookie')
  if (typeof key === 'string') {
    if (!cookie) {
      return undefined
    }
    const obj = parse(cookie, key)
    return obj[key]
  }
  if (!cookie) {
    return {}
  }
  const obj = parse(cookie)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj as any
}

export const getSignedCookie: GetSignedCookie = async (c, secret, key?) => {
  const cookie = c.req.raw.headers.get('Cookie')
  if (typeof key === 'string') {
    if (!cookie) {
      return undefined
    }
    const obj = await parseSigned(cookie, secret, key)
    return obj[key]
  }
  if (!cookie) {
    return {}
  }
  const obj = await parseSigned(cookie, secret)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj as any
}

export const setCookie = (c: Context, name: string, value: string, opt?: CookieOptions): void => {
  const cookie = serialize(name, value, { path: '/', ...opt })
  c.header('set-cookie', cookie, { append: true })
}

export const setSignedCookie = async (
  c: Context,
  name: string,
  value: string,
  secret: string | BufferSource,
  opt?: CookieOptions
): Promise<void> => {
  const cookie = await serializeSigned(name, value, secret, { path: '/', ...opt })
  c.header('set-cookie', cookie, { append: true })
}

export const deleteCookie = (c: Context, name: string, opt?: CookieOptions): void => {
  setCookie(c, name, '', { ...opt, maxAge: 0 })
}
