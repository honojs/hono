import { encodeBase64Url, decodeBase64Url } from '../../utils/encode.ts'
import { AlgorithmTypes, type SignatureAlgorithm } from './jwa.ts'
import { signing, verifying, type SignatureKey } from './jws.ts'
import { JwtHeaderInvalid, type JWTPayload } from './types.ts'
import {
  JwtTokenInvalid,
  JwtTokenNotBefore,
  JwtTokenExpired,
  JwtTokenSignatureMismatched,
  JwtTokenIssuedAt,
} from './types.ts'
import { utf8Decoder, utf8Encoder } from './utf8.ts'

const encodeJwtPart = (part: unknown): string =>
  encodeBase64Url(utf8Encoder.encode(JSON.stringify(part))).replace(/=/g, '')
const encodeSignaturePart = (buf: ArrayBufferLike): string => encodeBase64Url(buf).replace(/=/g, '')

const decodeJwtPart = (part: string): TokenHeader | JWTPayload | undefined =>
  JSON.parse(utf8Decoder.decode(decodeBase64Url(part)))

export interface TokenHeader {
  alg: SignatureAlgorithm
  typ?: 'JWT'
}

// eslint-disable-next-line
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
  const encodedHeader = encodeJwtPart({ alg, typ: 'JWT' } satisfies TokenHeader)

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
  const now = Math.floor(Date.now() / 1000)
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

// eslint-disable-next-line
export const decode = (token: string): { header: TokenHeader; payload: JWTPayload } => {
  try {
    const [h, p] = token.split('.')
    const header = decodeJwtPart(h) as TokenHeader
    const payload = decodeJwtPart(p) as JWTPayload
    return {
      header,
      payload,
    }
  } catch (e) {
    throw new JwtTokenInvalid(token)
  }
}
