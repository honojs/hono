import { decodeBase64 } from '../encode.ts'
import type { AlgorithmParams, CryptoKeyUsage } from './types.ts'
import { utf8Encoder } from './utf8.ts'

export function pemToBinary(pem: string): Uint8Array {
  return decodeBase64(pem.replace(/-+(BEGIN|END).*/g, '').replace(/\s/g, ''))
}

type ImportKeyUsage = CryptoKeyUsage.Sign | CryptoKeyUsage.Verify

export async function importPrivateKey(
  key: string | JsonWebKey,
  alg: AlgorithmParams,
  usages: ImportKeyUsage[]
): Promise<CryptoKey> {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }
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

export async function importPublicKey(
  key: string | JsonWebKey,
  alg: AlgorithmParams,
  usages: ImportKeyUsage[]
): Promise<CryptoKey> {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
  }
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
