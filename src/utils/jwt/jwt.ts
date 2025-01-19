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
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenIssuedAt,
  JwtTokenNotBefore,
  JwtTokenSignatureMismatched,
} from './types'
import type { JWTPayload } from './types'
import { utf8Decoder, utf8Encoder } from './utf8'

const encodeJwtPart = (part: unknown): string =>
  encodeBase64Url(utf8Encoder.encode(JSON.stringify(part))).replace(/=/g, '')
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

export const verify = async (
  token: string,
  publicKey: SignatureKey,
  alg: SignatureAlgorithm = 'HS256'
): Promise<JWTPayload> => {
  const tokenParts = token.split('.')
  if (tokenParts.length !== 3) {
    throw new JwtTokenInvalid(token)
  }

  const { header, payload } = decode(token)
  if (!isTokenHeader(header)) {
    throw new JwtHeaderInvalid(header)
  }
  const now = (Date.now() / 1000) | 0
  if (payload.nbf && payload.nbf > now) {
    throw new JwtTokenNotBefore(token)
  }
  if (payload.exp && payload.exp <= now) {
    throw new JwtTokenExpired(token)
  }
  if (payload.iat && now < payload.iat) {
    throw new JwtTokenIssuedAt(now, payload.iat)
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

export const verifyFromJwks = async (
  token: string,
  keys: HonoJsonWebKey[]
): Promise<JWTPayload> => {
  const header = decodeHeader(token)

  if (!isTokenHeader(header)) {
    throw new JwtHeaderInvalid(header)
  }
  if (!header.kid) {
    throw new JwtHeaderRequiresKid(header)
  }

  const matchingKey = keys.find((key) => key.kid === header.kid)
  if (!matchingKey) {
    throw new JwtTokenInvalid(token)
  }

  return await verify(token, matchingKey, matchingKey.alg as SignatureAlgorithm)
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
