import { Buffer } from "https://deno.land/std@0.163.0/node/buffer.ts";
export const encodeBase64 = (str: string): string => {
  if (str === null) {
    throw new TypeError('1st argument of "encodeBase64" should not be null.')
  }
  try {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    return btoa(String.fromCharCode(...bytes))
  } catch {}

  try {
    return Buffer.from(str).toString('base64')
  } catch (e) {
    console.error('If you want to do "encodeBase64", polyfill "buffer" module.')
    throw e
  }
}

export const decodeBase64 = (str: string): string => {
  if (str === null) {
    throw new TypeError('1st argument of "decodeBase64" should not be null.')
  }
  try {
    const text = atob(str)
    const bytes = new Uint8Array(text.split('').map((c) => c.charCodeAt(0)))
    const decoder = new TextDecoder()
    return decoder.decode(bytes)
  } catch {}

  try {
    return Buffer.from(str, 'base64').toString()
  } catch (e) {
    console.error('If you want to do "decodeBase64", polyfill "buffer" module.')
    throw e
  }
}

export const encodeBase64URL = (str: string): string => {
  return encodeBase64(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export const decodeBase64URL = (str: string): string => {
  const pad = (s: string) => {
    const diff = s.length % 4
    if (diff === 2) {
      return `${s}==`
    }
    if (diff === 3) {
      return `${s}=`
    }
    return s
  }

  return decodeBase64(pad(str).replace(/-/g, '+').replace('_', '/'))
}

export const utf8ToUint8Array = (str: string): Uint8Array => {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

export const arrayBufferToBase64 = async (buf: ArrayBuffer): Promise<string> => {
  if (typeof btoa === 'function') {
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
  }

  try {
    return Buffer.from(String.fromCharCode(...new Uint8Array(buf))).toString('base64')
  } catch (e) {}

  return ''
}

export const arrayBufferToBase64URL = async (buf: ArrayBuffer) => {
  return (await arrayBufferToBase64(buf)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
