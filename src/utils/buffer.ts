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

type StringHashFunction = (input: string) => string | null | Promise<string | null>

const timingSafeEqualString = async (
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

type TimingSafeEqual = {
  (a: string, b: string, hashFunction?: StringHashFunction): Promise<boolean>
  /**
   * @deprecated object and boolean signatures that take boolean as first and second arguments, and functions with signatures that take non-string arguments have been deprecated
   */
  (
    a: string | object | boolean,
    b: string | object | boolean,
    hashFunction?: Function
  ): Promise<boolean>
}
export const timingSafeEqual: TimingSafeEqual = async (
  a,
  b,
  hashFunction?: Function
): Promise<boolean> => {
  if (typeof a === 'string' && typeof b === 'string') {
    return timingSafeEqualString(a, b, hashFunction as StringHashFunction)
  }

  if (!hashFunction) {
    hashFunction = sha256
  }

  const [sa, sb] = await Promise.all([hashFunction(a), hashFunction(b)])

  if (!sa || !sb || typeof sa !== 'string' || typeof sb !== 'string') {
    return false
  }

  return timingSafeEqualString(sa, sb)
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
      'Content-Type': contentType,
    },
  })
  return response.formData()
}
