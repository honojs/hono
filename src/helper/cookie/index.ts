/**
 * @module
 * Cookie Helper for Hono.
 */

import type { Context } from '../../context'
import {
  parse,
  parseEncrypted,
  parseSigned,
  serialize,
  serializeEncrypted,
  serializeSigned,
} from '../../utils/cookie'
import type {
  Cookie,
  CookieOptions,
  CookiePrefixOptions,
  EncryptedCookie,
  SignedCookie,
} from '../../utils/cookie'

interface GetCookie {
  (c: Context, key: string): string | undefined
  (c: Context): Cookie
  (c: Context, key: string, prefixOptions?: CookiePrefixOptions): string | undefined
}

interface GetSignedCookie {
  (c: Context, secret: string | BufferSource, key: string): Promise<string | undefined | false>
  (c: Context, secret: string | BufferSource): Promise<SignedCookie>
  (
    c: Context,
    secret: string | BufferSource,
    key: string,
    prefixOptions?: CookiePrefixOptions
  ): Promise<string | undefined | false>
}

export const getCookie: GetCookie = (c, key?, prefix?: CookiePrefixOptions) => {
  const cookie = c.req.raw.headers.get('Cookie')
  if (typeof key === 'string') {
    if (!cookie) {
      return undefined
    }
    let finalKey = key
    if (prefix === 'secure') {
      finalKey = '__Secure-' + key
    } else if (prefix === 'host') {
      finalKey = '__Host-' + key
    }
    const obj = parse(cookie, finalKey)
    return obj[finalKey]
  }
  if (!cookie) {
    return {}
  }
  const obj = parse(cookie)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj as any
}

export const getSignedCookie: GetSignedCookie = async (
  c,
  secret,
  key?,
  prefix?: CookiePrefixOptions
) => {
  const cookie = c.req.raw.headers.get('Cookie')
  if (typeof key === 'string') {
    if (!cookie) {
      return undefined
    }
    let finalKey = key
    if (prefix === 'secure') {
      finalKey = '__Secure-' + key
    } else if (prefix === 'host') {
      finalKey = '__Host-' + key
    }
    const obj = await parseSigned(cookie, secret, finalKey)
    return obj[finalKey]
  }
  if (!cookie) {
    return {}
  }
  const obj = await parseSigned(cookie, secret)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj as any
}

export const generateCookie = (name: string, value: string, opt?: CookieOptions): string => {
  // Cookie names prefixed with __Secure- can be used only if they are set with the secure attribute.
  // Cookie names prefixed with __Host- can be used only if they are set with the secure attribute, must have a path of / (meaning any path at the host)
  // and must not have a Domain attribute.
  // Read more at https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#cookie_prefixes'
  let cookie
  if (opt?.prefix === 'secure') {
    cookie = serialize('__Secure-' + name, value, { path: '/', ...opt, secure: true })
  } else if (opt?.prefix === 'host') {
    cookie = serialize('__Host-' + name, value, {
      ...opt,
      path: '/',
      secure: true,
      domain: undefined,
    })
  } else {
    cookie = serialize(name, value, { path: '/', ...opt })
  }
  return cookie
}

export const setCookie = (c: Context, name: string, value: string, opt?: CookieOptions): void => {
  const cookie = generateCookie(name, value, opt)
  c.header('Set-Cookie', cookie, { append: true })
}

export const generateSignedCookie = async (
  name: string,
  value: string,
  secret: string | BufferSource,
  opt?: CookieOptions
): Promise<string> => {
  let cookie
  if (opt?.prefix === 'secure') {
    cookie = await serializeSigned('__Secure-' + name, value, secret, {
      path: '/',
      ...opt,
      secure: true,
    })
  } else if (opt?.prefix === 'host') {
    cookie = await serializeSigned('__Host-' + name, value, secret, {
      ...opt,
      path: '/',
      secure: true,
      domain: undefined,
    })
  } else {
    cookie = await serializeSigned(name, value, secret, { path: '/', ...opt })
  }
  return cookie
}

export const setSignedCookie = async (
  c: Context,
  name: string,
  value: string,
  secret: string | BufferSource,
  opt?: CookieOptions
): Promise<void> => {
  const cookie = await generateSignedCookie(name, value, secret, opt)
  c.header('set-cookie', cookie, { append: true })
}

interface GetEncryptedCookie {
  (c: Context, secret: string | BufferSource, key: string): Promise<string | undefined | false>
  (c: Context, secret: string | BufferSource): Promise<EncryptedCookie>
  (
    c: Context,
    secret: string | BufferSource,
    key: string,
    prefixOptions?: CookiePrefixOptions
  ): Promise<string | undefined | false>
}

/**
 * Get an encrypted cookie value. Returns the decrypted plaintext,
 * `undefined` if the cookie doesn't exist, or `false` if decryption fails.
 * @example
 * ```ts
 * app.get('/read', async (c) => {
 *   const value = await getEncryptedCookie(c, secret, 'session')
 *   // value: string | undefined | false
 * })
 * ```
 */
export const getEncryptedCookie: GetEncryptedCookie = async (
  c,
  secret,
  key?,
  prefix?: CookiePrefixOptions
) => {
  const cookie = c.req.raw.headers.get('Cookie')
  if (typeof key === 'string') {
    if (!cookie) {
      return undefined
    }
    let finalKey = key
    if (prefix === 'secure') {
      finalKey = '__Secure-' + key
    } else if (prefix === 'host') {
      finalKey = '__Host-' + key
    }
    const obj = await parseEncrypted(cookie, secret, finalKey)
    return obj[finalKey]
  }
  if (!cookie) {
    return {}
  }
  const obj = await parseEncrypted(cookie, secret)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj as any
}

/**
 * Generate an encrypted cookie string without setting it on the response.
 * Useful for testing or manual header manipulation.
 */
export const generateEncryptedCookie = async (
  name: string,
  value: string,
  secret: string | BufferSource,
  opt?: CookieOptions
): Promise<string> => {
  let cookie
  if (opt?.prefix === 'secure') {
    cookie = await serializeEncrypted('__Secure-' + name, value, secret, {
      path: '/',
      ...opt,
      secure: true,
    })
  } else if (opt?.prefix === 'host') {
    cookie = await serializeEncrypted('__Host-' + name, value, secret, {
      ...opt,
      path: '/',
      secure: true,
      domain: undefined,
    })
  } else {
    cookie = await serializeEncrypted(name, value, secret, { path: '/', ...opt })
  }
  return cookie
}

/**
 * Set an encrypted cookie using AES-256-GCM.
 * The cookie value is encrypted and the plaintext is not visible in the cookie header.
 * @example
 * ```ts
 * app.get('/write', async (c) => {
 *   await setEncryptedCookie(c, 'session', 'user-data', secret)
 * })
 * ```
 */
export const setEncryptedCookie = async (
  c: Context,
  name: string,
  value: string,
  secret: string | BufferSource,
  opt?: CookieOptions
): Promise<void> => {
  const cookie = await generateEncryptedCookie(name, value, secret, opt)
  c.header('set-cookie', cookie, { append: true })
}

export const deleteCookie = (c: Context, name: string, opt?: CookieOptions): string | undefined => {
  const deletedCookie = getCookie(c, name, opt?.prefix)
  setCookie(c, name, '', { ...opt, maxAge: 0 })
  return deletedCookie
}
