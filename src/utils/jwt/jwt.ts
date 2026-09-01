/**
 * @module
 * JSON Web Token (JWT)
 * https://datatracker.ietf.org/doc/html/rfc7519
 */

import { decodeBase64Url, encodeBase64Url } from '../../utils/encode'
import { AlgorithmTypes } from './jwa'
import type { AsymmetricAlgorithm, SignatureAlgorithm, SymmetricAlgorithm } from './jwa'
import { signing, verifying } from './jws'
import type { HonoJsonWebKey, SignatureKey } from './jws'
import {
  JwtAlgorithmMismatch,
  JwtAlgorithmNotAllowed,
  JwtAlgorithmRequired,
  JwtHeaderInvalid,
  JwtHeaderRequiresKid,
  JwtPayloadRequiresAud,
  JwtSymmetricAlgorithmNotAllowed,
  JwtTokenAudience,
  JwtTokenExpired,
  JwtTokenIssuedAt,
  JwtTokenIssuer,
  JwtTokenNotBefore,
  JwtTokenSignatureMismatched,
  JwtTokenInvalid,
} from './types'
import type { JWTPayload } from './types'
import { utf8Decoder, utf8Encoder } from './utf8'

const encodeJwtPart = (part: unknown): string =>
  encodeBase64Url(utf8Encoder.encode(JSON.stringify(part)).buffer).replace(/=/g, '')
const encodeSignaturePart = (buf: ArrayBufferLike): string => encodeBase64Url(buf).replace(/=/g, '')

const decodeJwtPart = (part: string): TokenHeader | JWTPayload | undefined =>
  JSON.parse(utf8Decoder.decode(decodeBase64Url(part)))

export interface TokenHeader {
  alg: SignatureAlgorithm
  typ?: 'JWT'
  kid?: string
}

export function isTokenHeader(obj: unknown): obj is TokenHeader {
  if (typeof obj === 'object' && obj !== null) {
    const objWithAlg = obj as { [key: string]: unknown }
    return (
      'alg' in objWithAlg &&
      Object.values(AlgorithmTypes).includes(objWithAlg.alg as AlgorithmTypes) &&
      (!('typ' in objWithAlg) || objWithAlg.typ === 'JWT')
    )
  }
  return false
}

export const sign = async (
  payload: JWTPayload,
  privateKey: SignatureKey,
  alg: SignatureAlgorithm = 'HS256'
): Promise<string> => {
  const encodedPayload = encodeJwtPart(payload)
  let encodedHeader
  if (typeof privateKey === 'object' && 'alg' in privateKey) {
    alg = privateKey.alg as SignatureAlgorithm
    encodedHeader = encodeJwtPart({ alg, typ: 'JWT', kid: privateKey.kid })
  } else {
    encodedHeader = encodeJwtPart({ alg, typ: 'JWT' })
  }

  const partialToken = `${encodedHeader}.${encodedPayload}`

  const signaturePart = await signing(privateKey, alg, utf8Encoder.encode(partialToken))
  const signature = encodeSignaturePart(signaturePart)

  return `${partialToken}.${signature}`
}

export type VerifyOptions = {
  /** The expected issuer used for verifying the token */
  iss?: string | RegExp
  /** Verify the `nbf` claim (default: `true`) */
  nbf?: boolean
  /** Verify the `exp` claim (default: `true`) */
  exp?: boolean
  /** Verify the `iat` claim (default: `true`) */
  iat?: boolean
  /** Acceptable audience(s) for the token */
  aud?: string | string[] | RegExp
}

export type VerifyOptionsWithAlg = {
  /** The algorithm used for decoding the token */
  alg: SignatureAlgorithm
} & VerifyOptions

type ParsedVerifyOptions = Required<
  Pick<VerifyOptions, 'nbf' | 'exp' | 'iat'>
> &
  Pick<VerifyOptions, 'iss' | 'aud'> & { alg: SignatureAlgorithm }

const parseOptions = (
  algOrOptions: SignatureAlgorithm | VerifyOptionsWithAlg
): ParsedVerifyOptions => {
  if (!algOrOptions) {
    throw new JwtAlgorithmRequired()
  }

  const {
    alg,
    iss,
    nbf = true,
    exp = true,
    iat = true,
    aud,
  } = typeof algOrOptions === 'string' ? { alg: algOrOptions } : algOrOptions

  if (!alg) {
    throw new JwtAlgorithmRequired()
  }

  return { alg, iss, nbf, exp, iat, aud }
}

const validateHeader = (
  token: string,
  header: TokenHeader,
  alg: SignatureAlgorithm
): void => {
  if (!isTokenHeader(header)) {
    throw new JwtHeaderInvalid(header)
  }
  if (header.alg !== alg) {
    throw new JwtAlgorithmMismatch(alg, header.alg)
  }
}

const validateNotBefore = (token: string, payload: JWTPayload, now: number): void => {
  if (payload.nbf !== undefined) {
    if (typeof payload.nbf !== 'number' || !Number.isFinite(payload.nbf) || payload.nbf > now) {
      throw new JwtTokenNotBefore(token)
    }
  }
}

const validateExpiration = (token: string, payload: JWTPayload, now: number): void => {
  if (payload.exp !== undefined) {
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp <= now) {
      throw new JwtTokenExpired(token)
    }
  }
}

const validateIssuedAt = (payload: JWTPayload, now: number): void => {
  if (payload.iat !== undefined) {
    if (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat) || now < payload.iat) {
      throw new JwtTokenIssuedAt(now, payload.iat)
    }
  }
}

const validateIssuer = (iss: string | RegExp | undefined, payload: JWTPayload): void => {
  if (!iss) {
    return
  }
  if (!payload.iss) {
    throw new JwtTokenIssuer(iss, null)
  }
  if (typeof iss === 'string' && payload.iss !== iss) {
    throw new JwtTokenIssuer(iss, payload.iss)
  }
  if (iss instanceof RegExp && !iss.test(payload.iss)) {
    throw new JwtTokenIssuer(iss, payload.iss)
  }
}

const validateAudience = (
  aud: string | string[] | RegExp | undefined,
  payload: JWTPayload
): void => {
  if (!aud) {
    return
  }
  if (!payload.aud) {
    throw new JwtPayloadRequiresAud(payload)
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  const matched = audiences.some((payloadAud): boolean =>
    aud instanceof RegExp
      ? aud.test(payloadAud)
      : typeof aud === 'string'
        ? payloadAud === aud
        : Array.isArray(aud) && aud.includes(payloadAud)
  )
  if (!matched) {
    throw new JwtTokenAudience(aud, payload.aud)
  }
}

const verifySignature = async (
  token: string,
  publicKey: SignatureKey,
  alg: SignatureAlgorithm,
  payload: JWTPayload
): Promise<void> => {
  const tokenParts = token.split('.')
  const headerPayload = token.substring(0, token.lastIndexOf('.'))
  const verified = await verifying(
    publicKey,
    alg,
    decodeBase64Url(tokenParts[2]),
    utf8Encoder.encode(headerPayload)
  )
  if (!verified) {
    throw new JwtTokenSignatureMismatched(token)
  }
}

export const verify = async (
  token: string,
  publicKey: SignatureKey,
  algOrOptions: SignatureAlgorithm | VerifyOptionsWithAlg
): Promise<JWTPayload> => {
  const { alg, iss, nbf, exp, iat, aud } = parseOptions(algOrOptions)

  const tokenParts = token.split('.')
  if (tokenParts.length !== 3) {
    throw new JwtTokenInvalid(token)
  }

  const { header, payload } = decode(token)
  validateHeader(token, header, alg)

  const now = Math.floor(Date.now() / 1000)
  if (nbf) {
    validateNotBefore(token, payload, now)
  }
  if (exp) {
    validateExpiration(token, payload, now)
  }
  if (iat) {
    validateIssuedAt(payload, now)
  }
  validateIssuer(iss, payload)
  validateAudience(aud, payload)

  await verifySignature(token, publicKey, alg, payload)

  return payload
}

// Symmetric algorithms that are not allowed for JWK verification
const symmetricAlgorithms: SymmetricAlgorithm[] = [
  AlgorithmTypes.HS256,
  AlgorithmTypes.HS384,
  AlgorithmTypes.HS512,
]

export const verifyWithJwks = async (
  token: string,
  options: {
    keys?: HonoJsonWebKey[]
    jwks_uri?: string
    verification?: VerifyOptions
    allowedAlgorithms: readonly AsymmetricAlgorithm[]
  },
  init?: RequestInit
): Promise<JWTPayload> => {
  const verifyOpts = options.verification || {}

  const header = decodeHeader(token)

  if (!isTokenHeader(header)) {
    throw new JwtHeaderInvalid(header)
  }
  if (!header.kid) {
    throw new JwtHeaderRequiresKid(header)
  }

  // Reject symmetric algorithms (HS256, HS384, HS512) to prevent algorithm confusion attacks
  if (symmetricAlgorithms.includes(header.alg as SymmetricAlgorithm)) {
    throw new JwtSymmetricAlgorithmNotAllowed(header.alg)
  }

  // Validate against allowed algorithms
  if (!options.allowedAlgorithms.includes(header.alg as AsymmetricAlgorithm)) {
    throw new JwtAlgorithmNotAllowed(header.alg, options.allowedAlgorithms)
  }

  let verifyKeys = options.keys ? [...options.keys] : undefined

  if (options.jwks_uri) {
    const response = await fetch(options.jwks_uri, init)
    if (!response.ok) {
      throw new Error(`failed to fetch JWKS from ${options.jwks_uri}`)
    }
    const data = (await response.json()) as { keys?: JsonWebKey[] }
    if (!data.keys) {
      throw new Error('invalid JWKS response. "keys" field is missing')
    }
    if (!Array.isArray(data.keys)) {
      throw new Error('invalid JWKS response. "keys" field is not an array')
    }
    verifyKeys ??= []
    verifyKeys.push(...(data.keys as HonoJsonWebKey[]))
  } else if (!verifyKeys) {
    throw new Error('verifyWithJwks requires options for either "keys" or "jwks_uri" or both')
  }

  const matchingKey = verifyKeys.find((key) => key.kid === header.kid)
  if (!matchingKey) {
    throw new JwtTokenInvalid(token)
  }

  // Verify that JWK's alg matches JWT header's alg when JWK has alg field
  if (matchingKey.alg && matchingKey.alg !== header.alg) {
    throw new JwtAlgorithmMismatch(matchingKey.alg, header.alg)
  }

  return await verify(token, matchingKey, {
    alg: header.alg,
    ...verifyOpts,
  })
}

export const decode = (token: string): { header: TokenHeader; payload: JWTPayload } => {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new JwtTokenInvalid(token)
  }
  try {
    const header = decodeJwtPart(parts[0]) as TokenHeader
    const payload = decodeJwtPart(parts[1]) as JWTPayload
    return {
      header,
      payload,
    }
  } catch {
    throw new JwtTokenInvalid(token)
  }
}

export const decodeHeader = (token: string): TokenHeader => {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new JwtTokenInvalid(token)
  }
  try {
    return decodeJwtPart(parts[0]) as TokenHeader
  } catch {
    throw new JwtTokenInvalid(token)
  }
}
