/**
 * @module
 * Cookie utility.
 */

import { decodeURIComponent_, tryDecode } from './url'

export type Cookie = Record<string, string>
export type SignedCookie = Record<string, string | false>
export type EncryptedCookie = Record<string, string | false>

type PartitionedCookieConstraint =
  | { partitioned: true; secure: true }
  | { partitioned?: boolean; secure?: boolean } // reset to default
type SecureCookieConstraint = { secure: true }
type HostCookieConstraint = { secure: true; path: '/'; domain?: undefined }

export type CookieOptions = {
  domain?: string
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None' | 'strict' | 'lax' | 'none'
  partitioned?: boolean
  priority?: 'Low' | 'Medium' | 'High' | 'low' | 'medium' | 'high'
  prefix?: CookiePrefixOptions
} & PartitionedCookieConstraint
export type CookiePrefixOptions = 'host' | 'secure'

export type CookieConstraint<Name> = Name extends `__Secure-${string}`
  ? CookieOptions & SecureCookieConstraint
  : Name extends `__Host-${string}`
    ? CookieOptions & HostCookieConstraint
    : CookieOptions

const algorithm = { name: 'HMAC', hash: 'SHA-256' }

const getCryptoKey = async (secret: string | BufferSource): Promise<CryptoKey> => {
  const secretBuf = typeof secret === 'string' ? new TextEncoder().encode(secret) : secret
  return await crypto.subtle.importKey('raw', secretBuf, algorithm, false, ['sign', 'verify'])
}

const makeSignature = async (value: string, secret: string | BufferSource): Promise<string> => {
  const key = await getCryptoKey(secret)
  const signature = await crypto.subtle.sign(algorithm.name, key, new TextEncoder().encode(value))
  // the returned base64 encoded signature will always be 44 characters long and end with one or two equal signs
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

const verifySignature = async (
  base64Signature: string,
  value: string,
  secret: CryptoKey
): Promise<boolean> => {
  try {
    const signatureBinStr = atob(base64Signature)
    const signature = new Uint8Array(signatureBinStr.length)
    for (let i = 0, len = signatureBinStr.length; i < len; i++) {
      signature[i] = signatureBinStr.charCodeAt(i)
    }
    return await crypto.subtle.verify(algorithm, secret, signature, new TextEncoder().encode(value))
  } catch {
    return false
  }
}

const encryptionAlgorithm = 'AES-GCM'
const IV_LENGTH = 12
const TAG_LENGTH_BIT = 128
const HKDF_SALT = new TextEncoder().encode('hono-encrypted-cookie-salt-v1')
const HKDF_INFO = new TextEncoder().encode('hono-encrypted-cookie')

const getEncryptionKey = async (secret: string | BufferSource): Promise<CryptoKey> => {
  const secretBuf = typeof secret === 'string' ? new TextEncoder().encode(secret) : secret
  const keyMaterial = await crypto.subtle.importKey('raw', secretBuf, 'HKDF', false, ['deriveKey'])
  return await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info: HKDF_INFO },
    keyMaterial,
    { name: encryptionAlgorithm, length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

const uint8ArrayToBase64 = (buf: Uint8Array): string => {
  let binary = ''
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i])
  }
  return btoa(binary)
}

const encrypt = async (value: string, cookieName: string, key: CryptoKey): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(value)
  const aad = new TextEncoder().encode(cookieName)
  const cipherBuf = await crypto.subtle.encrypt(
    { name: encryptionAlgorithm, iv, tagLength: TAG_LENGTH_BIT, additionalData: aad },
    key,
    encoded
  )
  const combined = new Uint8Array(IV_LENGTH + cipherBuf.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(cipherBuf), IV_LENGTH)
  return uint8ArrayToBase64(combined)
}

const decrypt = async (
  base64Encrypted: string,
  cookieName: string,
  key: CryptoKey
): Promise<string | false> => {
  try {
    const binStr = atob(base64Encrypted)
    const combined = new Uint8Array(binStr.length)
    for (let i = 0; i < binStr.length; i++) {
      combined[i] = binStr.charCodeAt(i)
    }
    if (combined.length < IV_LENGTH + TAG_LENGTH_BIT / 8) {
      return false
    }
    const iv = combined.slice(0, IV_LENGTH)
    const ciphertext = combined.slice(IV_LENGTH)
    const aad = new TextEncoder().encode(cookieName)
    const decrypted = await crypto.subtle.decrypt(
      { name: encryptionAlgorithm, iv, tagLength: TAG_LENGTH_BIT, additionalData: aad },
      key,
      ciphertext
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return false
  }
}

// all alphanumeric chars and all of _!#$%&'*.^`|~+-
// (see: https://datatracker.ietf.org/doc/html/rfc6265#section-4.1.1)
const validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/

// all ASCII chars 32-126 except 34, 59, and 92 (i.e. space to tilde but not double quote, semicolon, or backslash)
// (see: https://datatracker.ietf.org/doc/html/rfc6265#section-4.1.1)
//
// note: the spec also prohibits comma and space, but we allow both since they are very common in the real world
// (see: https://github.com/golang/go/issues/7243)
const validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/

const trimCookieWhitespace = (value: string): string => {
  let start = 0
  let end = value.length

  while (start < end) {
    const charCode = value.charCodeAt(start)
    if (charCode !== 0x20 && charCode !== 0x09) {
      break
    }
    start++
  }

  while (end > start) {
    const charCode = value.charCodeAt(end - 1)
    if (charCode !== 0x20 && charCode !== 0x09) {
      break
    }
    end--
  }

  return start === 0 && end === value.length ? value : value.slice(start, end)
}

export const parse = (cookie: string, name?: string): Cookie => {
  if (name && cookie.indexOf(name) === -1) {
    // Fast-path: return immediately if the demanded-key is not in the cookie string
    return {}
  }
  const pairs = cookie.split(';')
  const parsedCookie: Cookie = {}
  for (const pairStr of pairs) {
    const valueStartPos = pairStr.indexOf('=')
    if (valueStartPos === -1) {
      continue
    }

    const cookieName = trimCookieWhitespace(pairStr.substring(0, valueStartPos))
    if ((name && name !== cookieName) || !validCookieNameRegEx.test(cookieName)) {
      continue
    }

    let cookieValue = trimCookieWhitespace(pairStr.substring(valueStartPos + 1))
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1)
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] =
        cookieValue.indexOf('%') !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue
      if (name) {
        // Fast-path: return only the demanded-key immediately. Other keys are not needed.
        break
      }
    }
  }
  return parsedCookie
}

export const parseSigned = async (
  cookie: string,
  secret: string | BufferSource,
  name?: string
): Promise<SignedCookie> => {
  const parsedCookie: SignedCookie = {}
  const secretKey = await getCryptoKey(secret)

  for (const [key, value] of Object.entries(parse(cookie, name))) {
    const signatureStartPos = value.lastIndexOf('.')
    if (signatureStartPos < 1) {
      continue
    }

    const signedValue = value.substring(0, signatureStartPos)
    const signature = value.substring(signatureStartPos + 1)
    if (signature.length !== 44 || !signature.endsWith('=')) {
      continue
    }

    const isVerified = await verifySignature(signature, signedValue, secretKey)
    parsedCookie[key] = isVerified ? signedValue : false
  }

  return parsedCookie
}

const _serialize = (name: string, value: string, opt: CookieOptions = {}): string => {
  if (!validCookieNameRegEx.test(name)) {
    throw new Error('Invalid cookie name')
  }

  let cookie = `${name}=${value}`

  if (name.startsWith('__Secure-') && !opt.secure) {
    // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-4.1.3.1
    throw new Error('__Secure- Cookie must have Secure attributes')
  }

  if (name.startsWith('__Host-')) {
    // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-4.1.3.2
    if (!opt.secure) {
      throw new Error('__Host- Cookie must have Secure attributes')
    }

    if (opt.path !== '/') {
      throw new Error('__Host- Cookie must have Path attributes with "/"')
    }

    if (opt.domain) {
      throw new Error('__Host- Cookie must not have Domain attributes')
    }
  }

  for (const key of ['domain', 'path'] as (keyof CookieOptions)[]) {
    if (opt[key] && /[;\r\n]/.test(opt[key] as string)) {
      throw new Error(`${key} must not contain ";", "\\r", or "\\n"`)
    }
  }

  if (opt && typeof opt.maxAge === 'number' && opt.maxAge >= 0) {
    if (opt.maxAge > 34560000) {
      // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.6.2
      throw new Error(
        'Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.'
      )
    }
    cookie += `; Max-Age=${opt.maxAge | 0}`
  }

  if (opt.domain && opt.prefix !== 'host') {
    cookie += `; Domain=${opt.domain}`
  }

  if (opt.path) {
    cookie += `; Path=${opt.path}`
  }

  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 34560000_000) {
      // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.5
      throw new Error(
        'Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.'
      )
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`
  }

  if (opt.httpOnly) {
    cookie += '; HttpOnly'
  }

  if (opt.secure) {
    cookie += '; Secure'
  }

  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`
  }

  if (opt.priority) {
    cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`
  }

  if (opt.partitioned) {
    // https://www.ietf.org/archive/id/draft-cutler-httpbis-partitioned-cookies-01.html#section-2.1
    if (!opt.secure) {
      throw new Error('Partitioned Cookie must have Secure attributes')
    }
    cookie += '; Partitioned'
  }

  return cookie
}

export const serialize = <Name extends string>(
  name: Name,
  value: string,
  opt?: CookieConstraint<Name>
): string => {
  value = encodeURIComponent(value)
  return _serialize(name, value, opt)
}

export const serializeSigned = async (
  name: string,
  value: string,
  secret: string | BufferSource,
  opt: CookieOptions = {}
): Promise<string> => {
  const signature = await makeSignature(value, secret)
  value = `${value}.${signature}`
  value = encodeURIComponent(value)
  return _serialize(name, value, opt)
}

/**
 * Parse encrypted cookies from a cookie header string.
 * Uses AES-256-GCM decryption with HKDF-SHA256 key derivation.
 * Returns `false` for cookies that fail decryption (tampered or wrong key).
 */
export const parseEncrypted = async (
  cookie: string,
  secret: string | BufferSource,
  name?: string
): Promise<EncryptedCookie> => {
  const parsedCookie: EncryptedCookie = {}
  const key = await getEncryptionKey(secret)

  for (const [cookieName, value] of Object.entries(parse(cookie, name))) {
    try {
      const decoded = decodeURIComponent_(value)
      parsedCookie[cookieName] = await decrypt(decoded, cookieName, key)
    } catch {
      parsedCookie[cookieName] = false
    }
  }

  return parsedCookie
}

/**
 * Serialize a cookie value with AES-256-GCM encryption.
 * The cookie value is encrypted using a random IV and encoded as base64.
 */
export const serializeEncrypted = async (
  name: string,
  value: string,
  secret: string | BufferSource,
  opt: CookieOptions = {}
): Promise<string> => {
  const key = await getEncryptionKey(secret)
  const encrypted = await encrypt(value, name, key)
  value = encodeURIComponent(encrypted)
  return _serialize(name, value, opt)
}
