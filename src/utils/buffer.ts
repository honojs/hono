import { sha256 } from './crypto'

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
  b: string | object | boolean
) => {
  const sa = await sha256(a)
  const sb = await sha256(b)
  return sa === sb && a === b
}
