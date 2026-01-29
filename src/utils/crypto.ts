/**
 * @module
 * Crypto utility.
 */

import type { JSONValue } from './types'

type Algorithm = {
  name: string
  alias: string
}

type Data = string | boolean | number | JSONValue | ArrayBufferView | ArrayBuffer

/**
 * Calculates the SHA-256 digest of the given data.
 *
 * @param data - The data to calculate the SHA-256 digest for.
 * @returns The SHA-256 digest of the data, or null if the Web Crypto API is not available.
 *
 * @example
 * ```ts
 * const hash = await sha256('hello')
 * console.log(hash) // 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
 * ```
 */
export const sha256 = async (data: Data): Promise<string | null> => {
  const algorithm: Algorithm = { name: 'SHA-256', alias: 'sha256' }
  const hash = await createHash(data, algorithm)
  return hash
}

/**
 * Calculates the SHA-1 digest of the given data.
 *
 * @param data - The data to calculate the SHA-1 digest for.
 * @returns The SHA-1 digest of the data, or null if the Web Crypto API is not available.
 *
 * @example
 * ```ts
 * const hash = await sha1('hello')
 * console.log(hash) // aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d
 * ```
 */
export const sha1 = async (data: Data): Promise<string | null> => {
  const algorithm: Algorithm = { name: 'SHA-1', alias: 'sha1' }
  const hash = await createHash(data, algorithm)
  return hash
}

/**
 * Calculates the MD5 digest of the given data.
 *
 * @param data - The data to calculate the MD5 digest for.
 * @returns The MD5 digest of the data, or null if the Web Crypto API is not available.
 *
 * @example
 * ```ts
 * const hash = await md5('hello')
 * console.log(hash) // 5d41402abc4b2a76b9719d911017c592
 * ```
 */
export const md5 = async (data: Data): Promise<string | null> => {
  const algorithm: Algorithm = { name: 'MD5', alias: 'md5' }
  const hash = await createHash(data, algorithm)
  return hash
}

export const createHash = async (data: Data, algorithm: Algorithm): Promise<string | null> => {
  let sourceBuffer: ArrayBufferView | ArrayBuffer

  if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
    sourceBuffer = data
  } else {
    if (typeof data === 'object') {
      data = JSON.stringify(data)
    }
    sourceBuffer = new TextEncoder().encode(String(data))
  }

  if (crypto && crypto.subtle) {
    const buffer = await crypto.subtle.digest(
      {
        name: algorithm.name,
      },
      sourceBuffer as ArrayBuffer
    )
    const hash = Array.prototype.map
      .call(new Uint8Array(buffer), (x) => ('00' + x.toString(16)).slice(-2))
      .join('')
    return hash
  }
  return null
}
