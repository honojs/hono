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

const _decodeURIComponent = decodeURIComponent

export const bufferToFormData = (arrayBuffer: ArrayBuffer, contentType: string) => {
  const decoder = new TextDecoder('utf-8')
  const content = decoder.decode(arrayBuffer)
  const formData = new FormData()

  const boundaryMatch = contentType.match(/boundary=(.+)/)
  const boundary = boundaryMatch ? boundaryMatch[1] : ''

  if (contentType.startsWith('multipart/form-data') && boundary) {
    const parts = content.split('--' + boundary).slice(1, -1)
    for (const part of parts) {
      const [header, body] = part.split('\r\n\r\n')
      const nameMatch = header.match(/name="([^"]+)"/)
      if (nameMatch) {
        const name = nameMatch[1]
        formData.append(name, body.trim())
      }
    }
  } else if (contentType.startsWith('application/x-www-form-urlencoded')) {
    const pairs = content.split('&')
    for (const pair of pairs) {
      const [key, value] = pair.split('=')
      formData.append(_decodeURIComponent(key), _decodeURIComponent(value))
    }
  }

  return formData
}
