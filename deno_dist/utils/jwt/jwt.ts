import { encodeBase64Url, decodeBase64Url } from '../../utils/encode.ts'
import { AlgorithmTypes, JwtTokenIssuedAt } from './types.ts'
import {
  JwtTokenInvalid,
  JwtTokenNotBefore,
  JwtTokenExpired,
  JwtTokenSignatureMismatched,
  JwtAlgorithmNotImplemented,
} from './types.ts'

interface AlgorithmParams {
  name: string
  namedCurve?: string
  hash?: {
    name: string
  }
}

enum CryptoKeyFormat {
  RAW = 'raw',
  PKCS8 = 'pkcs8',
  SPKI = 'spki',
  JWK = 'jwk',
}

enum CryptoKeyUsage {
  Ecrypt = 'encrypt',
  Decrypt = 'decrypt',
  Sign = 'sign',
  Verify = 'verify',
  Deriverkey = 'deriveKey',
  DeriveBits = 'deriveBits',
  WrapKey = 'wrapKey',
  UnwrapKey = 'unwrapKey',
}

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder()

const encodeJwtPart = (part: unknown): string =>
  encodeBase64Url(utf8Encoder.encode(JSON.stringify(part))).replace(/=/g, '')
const encodeSignaturePart = (buf: ArrayBufferLike): string => encodeBase64Url(buf).replace(/=/g, '')

const decodeJwtPart = (part: string): unknown =>
  JSON.parse(utf8Decoder.decode(decodeBase64Url(part)))

const param = (name: AlgorithmTypes): AlgorithmParams => {
  switch (name.toUpperCase()) {
    case 'HS256':
      return {
        name: 'HMAC',
        hash: {
          name: 'SHA-256',
        },
      }
    case 'HS384':
      return {
        name: 'HMAC',
        hash: {
          name: 'SHA-384',
        },
      }
    case 'HS512':
      return {
        name: 'HMAC',
        hash: {
          name: 'SHA-512',
        },
      }
    default:
      throw new JwtAlgorithmNotImplemented(name)
  }
}

const signing = async (
  data: string,
  secret: string,
  alg: AlgorithmTypes = AlgorithmTypes.HS256
): Promise<ArrayBuffer> => {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }

  const utf8Encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    CryptoKeyFormat.RAW,
    utf8Encoder.encode(secret),
    param(alg),
    false,
    [CryptoKeyUsage.Sign]
  )
  return await crypto.subtle.sign(param(alg), cryptoKey, utf8Encoder.encode(data))
}

export const sign = async (
  payload: unknown,
  secret: string,
  alg: AlgorithmTypes = AlgorithmTypes.HS256
): Promise<string> => {
  const encodedPayload = encodeJwtPart(payload)
  const encodedHeader = encodeJwtPart({ alg, typ: 'JWT' })

  const partialToken = `${encodedHeader}.${encodedPayload}`

  const signaturePart = await signing(partialToken, secret, alg)
  const signature = encodeSignaturePart(signaturePart)

  return `${partialToken}.${signature}`
}

export const verify = async (
  token: string,
  secret: string,
  alg: AlgorithmTypes = AlgorithmTypes.HS256
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const tokenParts = token.split('.')
  if (tokenParts.length !== 3) {
    throw new JwtTokenInvalid(token)
  }

  const { payload } = decode(token)
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

  const signaturePart = tokenParts.slice(0, 2).join('.')
  const signature = await signing(signaturePart, secret, alg)
  const encodedSignature = encodeSignaturePart(signature)
  if (encodedSignature !== tokenParts[2]) {
    throw new JwtTokenSignatureMismatched(token)
  }

  return payload
}

// eslint-disable-next-line
export const decode = (token: string): { header: any; payload: any } => {
  try {
    const [h, p] = token.split('.')
    const header = decodeJwtPart(h)
    const payload = decodeJwtPart(p)
    return {
      header,
      payload,
    }
  } catch (e) {
    throw new JwtTokenInvalid(token)
  }
}
