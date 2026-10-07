/**
 * @module
 * Buffer utility.
 */

import { sha256 } from './crypto'

export const equal = (a: ArrayBuffer, b: ArrayBuffer): boolean => {
  if (a === b) {
    return true
  }
  if (a.byteLength !== b.byteLength) {
    return false
  }

  const va = new DataView(a)
  const vb = new DataView(b)

  let i = va.byteLength
  while (i--) {
    if (va.getUint8(i) !== vb.getUint8(i)) {
      return false
    }
  }

  return true
}

const constantTimeEqualString = (a: string, b: string): boolean => {
  const aLen = a.length
  const bLen = b.length
  const maxLen = Math.max(aLen, bLen)
  let out = aLen ^ bLen
  for (let i = 0; i < maxLen; i++) {
    const aChar = i < aLen ? a.charCodeAt(i) : 0
    const bChar = i < bLen ? b.charCodeAt(i) : 0
    out |= aChar ^ bChar
  }
  return out === 0
}

export type StringHashFunction = (input: string) => string | null | Promise<string | null>

export const timingSafeEqual = async (
  a: string,
  b: string,
  hashFunction?: StringHashFunction
): Promise<boolean> => {
  if (!hashFunction) {
    hashFunction = sha256
  }

  const [sa, sb] = await Promise.all([hashFunction(a), hashFunction(b)])

  if (sa == null || sb == null || typeof sa !== 'string' || typeof sb !== 'string') {
    return false
  }

  const hashEqual = constantTimeEqualString(sa, sb)
  const originalEqual = constantTimeEqualString(a, b)

  return hashEqual && originalEqual
}

export const bufferToString = (buffer: ArrayBuffer): string => {
  if (buffer instanceof ArrayBuffer) {
    const enc = new TextDecoder('utf-8')
    return enc.decode(buffer)
  }
  return buffer
}

export const bufferToFormData = (
  arrayBuffer: ArrayBuffer,
  contentType: string
): Promise<FormData> => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      'Content-Type': contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()),
    },
  })
  return response.formData()
}
