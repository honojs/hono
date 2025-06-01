export const generateDigest = async (
  input: ReadableStream<Uint8Array> | ArrayBuffer | null,
  generator: (body: Uint8Array) => ArrayBuffer | Promise<ArrayBuffer>
): Promise<string | null> => {
  if (!input) {
    return null
  }

  let result: ArrayBuffer | undefined = undefined

  if (input instanceof ArrayBuffer) {
    result = await generator(new Uint8Array(input))
  } else {
    const chunks: Uint8Array[] = []
    let totalLength = 0
    const reader = input.getReader()

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        if (value.length > 0) {
          chunks.push(value)
          totalLength += value.length
        }
      }

      if (totalLength === 0) {
        return null
      }

      const accumulated = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        accumulated.set(chunk, offset)
        offset += chunk.length
      }

      result = await generator(accumulated)
    } finally {
      reader.releaseLock()
    }
  }

  if (!result || result.byteLength === 0) {
    return null
  }

  const bytes = new Uint8Array(result)
  const hex = new Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    hex[i] = bytes[i].toString(16).padStart(2, '0')
  }
  return hex.join('')
}
