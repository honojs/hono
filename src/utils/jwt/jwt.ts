import { encodeBase64Url, decodeBase64Url } from '../../utils/encode'
import { AlgorithmTypes } from './types'
import {
  JwtTokenInvalid,
  JwtTokenNotBefore,
  JwtTokenExpired,
  JwtTokenSignatureMismatched,
  JwtAlgorithmNotImplemented,
} from './types'

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

  const signature = encodeBase64Url(await signing(partialToken, secret, alg)).replace(/=/g, '')

  return `${partialToken}.${signature}`
}

export const verify = async (
  token: string,
  secret: string,
  alg: AlgorithmTypes = AlgorithmTypes.HS256
): Promise<boolean> => {
  const tokenParts = token.split('.')
  if (tokenParts.length !== 3) {
    throw new JwtTokenInvalid(token)
  }

  const { payload } = decode(token)
  if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
    throw new JwtTokenNotBefore(token)
  }
  if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new JwtTokenExpired(token)
  }

  const signature = encodeBase64Url(
    await signing(tokenParts.slice(0, 2).join('.'), secret, alg)
  ).replace(/=/g, '')
  if (signature !== tokenParts[2]) {
    throw new JwtTokenSignatureMismatched(token)
  }

  return true
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
