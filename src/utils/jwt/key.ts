import { decodeBase64 } from '../encode'
import { CryptoKeyUsage } from './types'
import type { AlgorithmParams } from './types'
import { utf8Encoder } from './utf8'

export function pemToBinary(pem: string): Uint8Array {
  return decodeBase64(pem.replace(/-+(BEGIN|END).*/g, '').replace(/\s/g, ''))
}

export async function importPrivateKey(
  key: string | JsonWebKey,
  alg: AlgorithmParams
): Promise<CryptoKey> {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
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

export async function importPublicKey(
  key: string | JsonWebKey,
  alg: AlgorithmParams
): Promise<CryptoKey> {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error('`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.')
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
