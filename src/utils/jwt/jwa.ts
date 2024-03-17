import type { AlgorithmParams } from './types'
import { JwtAlgorithmNotImplemented } from './types'

// JSON Web Algorithms (JWA)
// https://datatracker.ietf.org/doc/html/rfc7518

export enum AlgorithmTypes {
  HS256 = 'HS256',
  HS384 = 'HS384',
  HS512 = 'HS512',
  RS256 = 'RS256',
  RS384 = 'RS384',
  RS512 = 'RS512',
  PS256 = 'PS256',
  PS384 = 'PS384',
  PS512 = 'PS512',
  ES256 = 'ES256',
  ES384 = 'ES384',
  ES512 = 'ES512',
  EdDSA = 'EdDSA',
}

export type SignatureAlgorithm = keyof typeof AlgorithmTypes

export const param = (name: SignatureAlgorithm): AlgorithmParams => {
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
