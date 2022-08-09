type Algorithm = {
  name: string
  alias: string
}

type Data = string | boolean | number | object | ArrayBufferView | ArrayBuffer | ReadableStream

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

export const md5 = async (data: Data) => {
  const algorithm: Algorithm = { name: 'MD5', alias: 'md5' }
  const hash = await createHash(data, algorithm)
  return hash
}

export const createHash = async (data: Data, algorithm: Algorithm): Promise<string | null> => {
  let sourceBuffer: ArrayBufferView | ArrayBuffer

  if (data instanceof ReadableStream) {
    let body = ''
    const reader = data.getReader()
    await reader?.read().then(async (chuck) => {
      const value = await createHash(chuck.value || '', algorithm)
      body += value
    })
    return body
  }
  if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
    sourceBuffer = data
  } else {
    if (typeof data === 'object') {
      data = JSON.stringify(data)
    }
    sourceBuffer = new TextEncoder().encode(String(data))
  }

  if (crypto && crypto.subtle) {
    const buffer = await crypto.subtle.digest(
      {
        name: algorithm.name,
      },
      sourceBuffer
    )
    const hash = Array.prototype.map
      .call(new Uint8Array(buffer), (x) => ('00' + x.toString(16)).slice(-2))
      .join('')
    return hash
  }
  return null
}
