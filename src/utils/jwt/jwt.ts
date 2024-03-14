import { encodeBase64Url, decodeBase64Url } from '../../utils/encode'
import { importPrivateKey, importPublicKey } from './key'
import type { AlgorithmParams, TokenHeader, AlgorithmTypeName } from './types'
import { JwtHeaderInvalid, JwtTokenIssuedAt, isTokenHeader } from './types'
import {
  JwtTokenInvalid,
  JwtTokenNotBefore,
  JwtTokenExpired,
  JwtTokenSignatureMismatched,
  JwtAlgorithmNotImplemented,
  CryptoKeyUsage,
} from './types'
import { utf8Decoder, utf8Encoder } from './utf8'

const encodeJwtPart = (part: unknown): string =>
  encodeBase64Url(utf8Encoder.encode(JSON.stringify(part))).replace(/=/g, '')
const encodeSignaturePart = (buf: ArrayBufferLike): string => encodeBase64Url(buf).replace(/=/g, '')

const decodeJwtPart = (part: string): unknown =>
  JSON.parse(utf8Decoder.decode(decodeBase64Url(part)))

const param = (name: AlgorithmTypeName): AlgorithmParams => {
  switch (name) {
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
    case 'RS256':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: {
          name: 'SHA-256',
        },
      }
    case 'RS384':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: {
          name: 'SHA-384',
        },
      }
    case 'RS512':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: {
          name: 'SHA-512',
        },
      }
    case 'PS256':
      return {
        name: 'RSA-PSS',
        hash: {
          name: 'SHA-256',
        },
        saltLength: 32, // 256 >> 3
      } satisfies RsaPssParams & RsaHashedImportParams
    case 'PS384':
      return {
        name: 'RSA-PSS',
        hash: {
          name: 'SHA-384',
        },
        saltLength: 48, // 384 >> 3
      } satisfies RsaPssParams & RsaHashedImportParams
    case 'PS512':
      return {
        name: 'RSA-PSS',
        hash: {
          name: 'SHA-512',
        },
        saltLength: 64, // 512 >> 3,
      } satisfies RsaPssParams & RsaHashedImportParams
    case 'ES256':
      return {
        name: 'ECDSA',
        hash: {
          name: 'SHA-256',
        },
        namedCurve: 'P-256',
      } satisfies EcdsaParams & EcKeyImportParams
    case 'ES384':
      return {
        name: 'ECDSA',
        hash: {
          name: 'SHA-384',
        },
        namedCurve: 'P-384',
      } satisfies EcdsaParams & EcKeyImportParams
    case 'ES512':
      return {
        name: 'ECDSA',
        hash: {
          name: 'SHA-512',
        },
        namedCurve: 'P-521',
      } satisfies EcdsaParams & EcKeyImportParams
    case 'EdDSA':
      // Currently, supported only Safari and Deno, Node.js.
      // See: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
      return {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      }
    default:
      throw new JwtAlgorithmNotImplemented(name)
  }
}

const signing = async (
  data: string,
  privateKey: string | JsonWebKey,
  alg: AlgorithmTypeName = 'HS256'
): Promise<ArrayBuffer> => {
  const algorithm = param(alg)
  const cryptoKey = await importPrivateKey(privateKey, algorithm, [CryptoKeyUsage.Sign])
  return await crypto.subtle.sign(algorithm, cryptoKey, utf8Encoder.encode(data))
}

export const sign = async (
  payload: unknown,
  privateKey: string | JsonWebKey,
  alg: AlgorithmTypeName = 'HS256'
): Promise<string> => {
  const encodedPayload = encodeJwtPart(payload)
  const encodedHeader = encodeJwtPart({ alg, typ: 'JWT' } satisfies TokenHeader)

  const partialToken = `${encodedHeader}.${encodedPayload}`

  const signaturePart = await signing(partialToken, privateKey, alg)
  const signature = encodeSignaturePart(signaturePart)

  return `${partialToken}.${signature}`
}

const verifying = async (
  publicKey: string | JsonWebKey,
  alg: AlgorithmTypeName = 'HS256',
  signature: BufferSource,
  data: BufferSource
): Promise<boolean> => {
  const algorithm = param(alg)
  const cryptoKey = await importPublicKey(publicKey, algorithm, [CryptoKeyUsage.Verify])
  return await crypto.subtle.verify(algorithm, cryptoKey, signature, data)
}

export const verify = async (
  token: string,
  publicKey: string | JsonWebKey,
  alg: AlgorithmTypeName = 'HS256'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
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
