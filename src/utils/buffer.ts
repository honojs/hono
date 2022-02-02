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

export const decodeBase64 = (str: string) => {
  try {
    const text = atob(str)
    const length = text.length
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      bytes[i] = text.charCodeAt(i)
    }
    const decoder = new TextDecoder()
    return decoder.decode(bytes)
  } catch {
    const { Buffer } = require('buffer')
    return Buffer.from(str, 'base64').toString()
  }
}

export const sha256 = async (a: string): Promise<string> => {
  if (crypto && crypto.subtle) {
    const buffer = await crypto.subtle.digest(
      {
        name: 'SHA-256',
      },
      new TextEncoder().encode(String(a))
    )
    const hash = Array.prototype.map.call(new Uint8Array(buffer), (x) => ('00' + x.toString(16)).slice(-2)).join('')
    return hash
  } else {
    const crypto = await import('crypto')
    const hash = crypto.createHash('sha256').update(a).digest('hex')
    return hash
  }
}

export const timingSafeEqual = async (a: any, b: any) => {
  const sa = await sha256(a)
  const sb = await sha256(b)
  return sa === sb && a === b
}
