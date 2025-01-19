/**
 * @module
 * JSON Web Signature (JWS)
 * https://datatracker.ietf.org/doc/html/rfc7515
 */

import { getRuntimeKey } from '../../helper/adapter'
import { decodeBase64 } from '../encode'
import type { SignatureAlgorithm } from './jwa'
import { CryptoKeyUsage, JwtAlgorithmNotImplemented } from './types'
import { utf8Encoder } from './utf8'

type KeyImporterAlgorithm = Parameters<typeof crypto.subtle.importKey>[2]
type KeyAlgorithm =
  | AlgorithmIdentifier
  | RsaHashedImportParams
  | (RsaPssParams & RsaHashedImportParams)
  | (EcdsaParams & EcKeyImportParams)
  | HmacImportParams

// Extending the JsonWebKey interface to include the "kid" property.
// https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.4
export interface HonoJsonWebKey extends JsonWebKey {
  kid?: string
}

export type SignatureKey = string | HonoJsonWebKey | CryptoKey

export async function signing(
  privateKey: SignatureKey,
  alg: SignatureAlgorithm,
  data: BufferSource
): Promise<ArrayBuffer> {
  const algorithm = getKeyAlgorithm(alg)
  const cryptoKey = await importPrivateKey(privateKey, algorithm)
  return await crypto.subtle.sign(algorithm, cryptoKey, data)
}

export async function verifying(
  publicKey: SignatureKey,
  alg: SignatureAlgorithm,
  signature: BufferSource,
  data: BufferSource
): Promise<boolean> {
  const algorithm = getKeyAlgorithm(alg)
  const cryptoKey = await importPublicKey(publicKey, algorithm)
  return await crypto.subtle.verify(algorithm, cryptoKey, signature, data)
}

function pemToBinary(pem: string): Uint8Array {
  return decodeBase64(pem.replace(/-+(BEGIN|END).*/g, '').replace(/\s/g, ''))
}

async function importPrivateKey(key: SignatureKey, alg: KeyImporterAlgorithm): Promise<CryptoKey> {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }
  if (isCryptoKey(key)) {
    if (key.type !== 'private' && key.type !== 'secret') {
      throw new Error(
        `unexpected key type: CryptoKey.type is ${key.type}, expected private or secret`
      )
    }
    return key
  }
  const usages = [CryptoKeyUsage.Sign]
  if (typeof key === 'object') {
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#json_web_key_import
    return await crypto.subtle.importKey('jwk', key, alg, false, usages)
  }
  if (key.includes('PRIVATE')) {
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#pkcs_8_import
    return await crypto.subtle.importKey('pkcs8', pemToBinary(key), alg, false, usages)
  }
  return await crypto.subtle.importKey('raw', utf8Encoder.encode(key), alg, false, usages)
}

async function importPublicKey(key: SignatureKey, alg: KeyImporterAlgorithm): Promise<CryptoKey> {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }
  if (isCryptoKey(key)) {
    if (key.type === 'public' || key.type === 'secret') {
      return key
    }
    key = await exportPublicJwkFrom(key)
  }
  if (typeof key === 'string' && key.includes('PRIVATE')) {
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#pkcs_8_import
    const privateKey = await crypto.subtle.importKey('pkcs8', pemToBinary(key), alg, true, [
      CryptoKeyUsage.Sign,
    ])
    key = await exportPublicJwkFrom(privateKey)
  }
  const usages = [CryptoKeyUsage.Verify]
  if (typeof key === 'object') {
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#json_web_key_import
    return await crypto.subtle.importKey('jwk', key, alg, false, usages)
  }
  if (key.includes('PUBLIC')) {
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#subjectpublickeyinfo_import
    return await crypto.subtle.importKey('spki', pemToBinary(key), alg, false, usages)
  }
  return await crypto.subtle.importKey('raw', utf8Encoder.encode(key), alg, false, usages)
}

// https://datatracker.ietf.org/doc/html/rfc7517
async function exportPublicJwkFrom(privateKey: CryptoKey): Promise<JsonWebKey> {
  if (privateKey.type !== 'private') {
    throw new Error(`unexpected key type: ${privateKey.type}`)
  }
  if (!privateKey.extractable) {
    throw new Error('unexpected private key is unextractable')
  }
  const jwk = await crypto.subtle.exportKey('jwk', privateKey)
  const { kty } = jwk // common
  const { alg, e, n } = jwk // rsa
  const { crv, x, y } = jwk // elliptic-curve
  return { kty, alg, e, n, crv, x, y, key_ops: [CryptoKeyUsage.Verify] }
}

function getKeyAlgorithm(name: SignatureAlgorithm): KeyAlgorithm {
  switch (name) {
    case 'HS256':
      return {
        name: 'HMAC',
        hash: {
          name: 'SHA-256',
        },
      } satisfies HmacImportParams
    case 'HS384':
      return {
        name: 'HMAC',
        hash: {
          name: 'SHA-384',
        },
      } satisfies HmacImportParams
    case 'HS512':
      return {
        name: 'HMAC',
        hash: {
          name: 'SHA-512',
        },
      } satisfies HmacImportParams
    case 'RS256':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: {
          name: 'SHA-256',
        },
      } satisfies RsaHashedImportParams
    case 'RS384':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: {
          name: 'SHA-384',
        },
      } satisfies RsaHashedImportParams
    case 'RS512':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: {
          name: 'SHA-512',
        },
      } satisfies RsaHashedImportParams
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

function isCryptoKey(key: SignatureKey): key is CryptoKey {
  const runtime = getRuntimeKey()
  // @ts-expect-error CryptoKey hasn't exported to global in node v18
  if (runtime === 'node' && !!crypto.webcrypto) {
    // @ts-expect-error CryptoKey hasn't exported to global in node v18
    return key instanceof crypto.webcrypto.CryptoKey
  }
  return key instanceof CryptoKey
}
