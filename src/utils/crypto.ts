type Algorithm = {
  name: string
  alias: string
}

type Data = string | object | boolean

export const sha256 = async (data: Data) => {
  const algorithm: Algorithm = { name: 'SHA-256', alias: 'sha256' }
  const hash = await createHash(data, algorithm)
  return hash
}

export const sha1 = async (data: Data) => {
  const algorithm: Algorithm = { name: 'SHA-1', alias: 'sha1' }
  const hash = await createHash(data, algorithm)
  return hash
}

export const createHash = async (data: Data, algorithm: Algorithm): Promise<string> => {
  if (crypto && crypto.subtle) {
    const buffer = await crypto.subtle.digest(
      {
        name: algorithm.name,
      },
      new TextEncoder().encode(String(data))
    )
    const hash = Array.prototype.map
      .call(new Uint8Array(buffer), (x) => ('00' + x.toString(16)).slice(-2))
      .join('')
    return hash
  }

  try {
    const crypto = require('crypto')
    const hash = crypto.createHash(algorithm.alias).update(data).digest('hex')
    return hash
  } catch (e) {
    console.error(`If you want to create hash ${algorithm.name}, polyfill "crypto" module.`)
    throw e
  }
}

export const encodeBase64 = (str: string) => {
  try {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    const length = bytes.byteLength
    let binary = ''
    for (let i = 0; i < length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  } catch {}
  try {
    const { Buffer } = require('buffer')
    return Buffer.from(str).toString('base64')
  } catch (e) {
    console.error('If you want to do "encodeBase64", polyfill "buffer" module.')
    throw e
  }
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
  } catch {}

  try {
    const { Buffer } = require('buffer')
    return Buffer.from(str, 'base64').toString()
  } catch (e) {
    console.error('If you want to do "decodeBase64", polyfill "buffer" module.')
    throw e
  }
}
