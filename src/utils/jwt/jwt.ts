/**
 * @module
 * JSON Web Token (JWT)
 * https://datatracker.ietf.org/doc/html/rfc7519
 */

import { decodeBase64Url, encodeBase64Url } from '../../utils/encode'
import { AlgorithmTypes } from './jwa'
import type { SignatureAlgorithm } from './jwa'
import { signing, verifying } from './jws'
import type { HonoJsonWebKey, SignatureKey } from './jws'
import {
  JwtHeaderInvalid,
  JwtHeaderRequiresKid,
  JwtPayloadRequiresAud,
  JwtTokenAudience,
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenIssuedAt,
  JwtTokenIssuer,
  JwtTokenNotBefore,
  JwtTokenSignatureMismatched,
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
  alg?: SignatureAlgorithm
} & VerifyOptions

export const verify = async (
  token: string,
  publicKey: SignatureKey,
  algOrOptions?: SignatureAlgorithm | VerifyOptionsWithAlg
): Promise<JWTPayload> => {
  const {
    alg = 'HS256',
    iss,
    nbf = true,
    exp = true,
    iat = true,
    aud,
  } = typeof algOrOptions === 'string' ? { alg: algOrOptions } : algOrOptions || {}

  const tokenParts = token.split('.')
  if (tokenParts.length !== 3) {
    throw new JwtTokenInvalid(token)
  }

  const { header, payload } = decode(token)
  if (!isTokenHeader(header)) {
    throw new JwtHeaderInvalid(header)
  }
  const now = (Date.now() / 1000) | 0
  if (nbf && payload.nbf && payload.nbf > now) {
    throw new JwtTokenNotBefore(token)
  }
  if (exp && payload.exp && payload.exp <= now) {
    throw new JwtTokenExpired(token)
  }
  if (iat && payload.iat && now < payload.iat) {
    throw new JwtTokenIssuedAt(now, payload.iat)
  }
  if (iss) {
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

  if (aud) {
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

  return payload
}

export const verifyWithJwks = async (
  token: string,
  options: {
    keys?: HonoJsonWebKey[]
    jwks_uri?: string
    verification?: VerifyOptions
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
    if (options.keys) {
      options.keys.push(...data.keys)
    } else {
      options.keys = data.keys
    }
  } else if (!options.keys) {
    throw new Error('verifyWithJwks requires options for either "keys" or "jwks_uri" or both')
  }

  const matchingKey = options.keys.find((key) => key.kid === header.kid)
  if (!matchingKey) {
    throw new JwtTokenInvalid(token)
  }

  return await verify(token, matchingKey, {
    alg: (matchingKey.alg as SignatureAlgorithm) || header.alg,
    ...verifyOpts,
  })
}

export const decode = (token: string): { header: TokenHeader; payload: JWTPayload } => {
  try {
    const [h, p] = token.split('.')
    const header = decodeJwtPart(h) as TokenHeader
    const payload = decodeJwtPart(p) as JWTPayload
    return {
      header,
      payload,
    }
  } catch {
    throw new JwtTokenInvalid(token)
  }
}

export const decodeHeader = (token: string): TokenHeader => {
  try {
    const [h] = token.split('.')
    return decodeJwtPart(h) as TokenHeader
  } catch {
    throw new JwtTokenInvalid(token)
  }
}
