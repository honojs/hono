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

export const timingSafeEqual = async (a: any, b: any) => {
  const sa = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    new TextEncoder().encode(String(a))
  )

  const sb = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    new TextEncoder().encode(String(b))
  )

  return equal(sa, sb) && a === b
}
