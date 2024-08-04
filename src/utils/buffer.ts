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

export const timingSafeEqual = async (
  a: string | object | boolean,
  b: string | object | boolean,
  hashFunction: Function = sha256
): Promise<boolean> => {
  const [sa, sb] = await Promise.all([hashFunction(a), hashFunction(b)])

  if (!sa || !sb) {
    return false
  }

  return sa === sb && a === b
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
