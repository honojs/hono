const mergeBuffers = (buffer1: ArrayBuffer | undefined, buffer2: Uint8Array): Uint8Array => {
  if (!buffer1) {
    return buffer2
  }
  const merged = new Uint8Array(buffer1.byteLength + buffer2.byteLength)
  merged.set(new Uint8Array(buffer1), 0)
  merged.set(buffer2, buffer1.byteLength)
  return merged
}

export const generateDigest = async (
  stream: ReadableStream<Uint8Array> | null,
  generateDigest?: (body: Uint8Array) => ArrayBuffer | Promise<ArrayBuffer>
): Promise<string | null> => {
  if (!stream || !crypto || !crypto.subtle) {
    return null
  }

  let result: ArrayBuffer | undefined = undefined
  generateDigest ||= (body: Uint8Array) =>
    crypto.subtle.digest(
      {
        name: 'SHA-1',
      },
      body
    )

  const reader = stream.getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    result = await generateDigest(mergeBuffers(result, value))
  }

  if (!result) {
    return null
  }

  return Array.prototype.map
    .call(new Uint8Array(result), (x) => x.toString(16).padStart(2, '0'))
    .join('')
}
