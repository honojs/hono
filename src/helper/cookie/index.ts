/**
 * @module
 * Cookie Helper for Hono.
 */

import type { Context } from '../../context'
import { parse, parseSigned, serialize, serializeSigned } from '../../utils/cookie'
import type { Cookie, CookieOptions, CookiePrefixOptions, SignedCookie } from '../../utils/cookie'

/**
 * Parses a Set-Cookie header string and extracts the cookie name, domain, and path.
 * These three attributes form the unique identifier for a cookie according to RFC 6265.
 */
const parseSetCookieHeader = (
  setCookieHeader: string
): { name: string; domain: string; path: string } => {
  const parts = setCookieHeader.split(';').map((part) => part.trim())
  const nameValuePair = parts[0]
  const nameEndIndex = nameValuePair.indexOf('=')
  const name = nameEndIndex !== -1 ? nameValuePair.substring(0, nameEndIndex) : nameValuePair

  let domain = ''
  let path = '/'

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const eqIndex = part.indexOf('=')
    if (eqIndex === -1) {
      continue
    }
    const attrName = part.substring(0, eqIndex).toLowerCase()
    const attrValue = part.substring(eqIndex + 1)
    if (attrName === 'domain') {
      // Domain comparison is case-insensitive per RFC 6265
      domain = attrValue.toLowerCase()
    } else if (attrName === 'path') {
      path = attrValue
    }
  }

  return { name, domain, path }
}

/**
 * Gets all Set-Cookie headers as an array.
 * Uses getSetCookie() if available (modern environments), otherwise parses the header manually.
 */
const getSetCookies = (headers: Headers): string[] => {
  // Use getSetCookie if available (standard in modern environments)
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }

  // Fallback: parse the comma-separated header
  // Note: This is tricky because cookie values can contain commas in Expires attribute
  const setCookieHeader = headers.get('Set-Cookie')
  if (!setCookieHeader) {
    return []
  }

  // Split by comma followed by a cookie name pattern (word followed by =)
  // This handles the Expires=Mon, 01 Jan 2024... case
  const cookies: string[] = []
  let current = ''

  const parts = setCookieHeader.split(',')
  for (const part of parts) {
    const trimmed = part.trim()
    // Check if this looks like the start of a new cookie (name=value pattern)
    // or if it's part of a date in Expires
    if (current && /^[\w!#$%&'*.^`|~+-]+=/.test(trimmed)) {
      cookies.push(current.trim())
      current = trimmed
    } else {
      current += (current ? ',' : '') + part
    }
  }
  if (current) {
    cookies.push(current.trim())
  }

  return cookies
}

/**
 * Checks if two cookies have the same identity (name + domain + path).
 * According to RFC 6265, these three attributes form the unique cookie identifier.
 */
const isSameCookie = (
  a: { name: string; domain: string; path: string },
  b: { name: string; domain: string; path: string }
): boolean => {
  // Name is case-sensitive, domain is case-insensitive (already lowercased), path is case-sensitive
  return a.name === b.name && a.domain === b.domain && a.path === b.path
}

/**
 * Removes existing Set-Cookie headers that match the given cookie identity.
 */
const replaceSetCookieHeaders = (headers: Headers, newCookieInfo: { name: string; domain: string; path: string }): void => {
  const existingCookies = getSetCookies(headers)

  // Filter out cookies with matching identity
  const filteredCookies = existingCookies.filter((cookieStr) => {
    const existing = parseSetCookieHeader(cookieStr)
    return !isSameCookie(existing, newCookieInfo)
  })

  // Only modify headers if we actually removed something
  if (filteredCookies.length !== existingCookies.length) {
    // Delete all Set-Cookie headers
    headers.delete('Set-Cookie')

    // Re-add the filtered cookies
    for (const cookie of filteredCookies) {
      headers.append('Set-Cookie', cookie)
    }
  }
}

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

  // Compute the final cookie name (with prefix if applicable)
  let finalName = name
  if (opt?.prefix === 'secure') {
    finalName = '__Secure-' + name
  } else if (opt?.prefix === 'host') {
    finalName = '__Host-' + name
  }

  // Build cookie identity for deduplication (RFC 6265: name + domain + path)
  const cookieInfo = {
    name: finalName,
    domain: opt?.domain?.toLowerCase() ?? '',
    path: opt?.path ?? '/',
  }

  // Remove any existing cookie with the same identity before adding the new one
  // This ensures we comply with RFC 6265 Section 4.1:
  // "Servers SHOULD NOT include more than one Set-Cookie header field in
  // the same response with the same cookie-name."
  replaceSetCookieHeaders(c.res.headers, cookieInfo)

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

  // Compute the final cookie name (with prefix if applicable)
  let finalName = name
  if (opt?.prefix === 'secure') {
    finalName = '__Secure-' + name
  } else if (opt?.prefix === 'host') {
    finalName = '__Host-' + name
  }

  // Build cookie identity for deduplication (RFC 6265: name + domain + path)
  const cookieInfo = {
    name: finalName,
    domain: opt?.domain?.toLowerCase() ?? '',
    path: opt?.path ?? '/',
  }

  // Remove any existing cookie with the same identity before adding the new one
  replaceSetCookieHeaders(c.res.headers, cookieInfo)

  c.header('set-cookie', cookie, { append: true })
}

export const deleteCookie = (c: Context, name: string, opt?: CookieOptions): string | undefined => {
  const deletedCookie = getCookie(c, name, opt?.prefix)
  setCookie(c, name, '', { ...opt, maxAge: 0 })
  return deletedCookie
}
