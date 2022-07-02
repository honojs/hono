import { sha256 } from './crypto.ts'

export const equal = (a: ArrayBuffer, b: ArrayBuffer) => {
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
  hashFunction?: Function
) => {
  if (!hashFunction) {
    hashFunction = sha256
  }
  const sa = await hashFunction(a)
  const sb = await hashFunction(b)
  return sa === sb && a === b
}

export const bufferToString = (buffer: ArrayBuffer): string => {
  if (buffer instanceof ArrayBuffer) {
    const enc = new TextDecoder('utf-8')
    return enc.decode(buffer)
  }
  return buffer
}
