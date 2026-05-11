const mergeBuffers = (
  buffer1: Uint8Array<ArrayBuffer> | undefined,
  buffer2: Uint8Array<ArrayBuffer>
): Uint8Array<ArrayBuffer> => {
  if (!buffer1) {
    return buffer2
  }
  const merged = new Uint8Array<ArrayBuffer>(
    new ArrayBuffer(buffer1.byteLength + buffer2.byteLength)
  )
  merged.set(buffer1, 0)
  merged.set(buffer2, buffer1.byteLength)
  return merged
}

export const generateDigest = async (
  stream: ReadableStream<Uint8Array<ArrayBuffer>> | null,
  generator: (body: Uint8Array<ArrayBuffer>) => ArrayBuffer | Promise<ArrayBuffer>
): Promise<string | null> => {
  if (!stream) {
    return null
  }

  let body: Uint8Array<ArrayBuffer> | undefined = undefined

  const reader = stream.getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    body = mergeBuffers(body, value)
  }

  if (!body) {
    return null
  }

  const result = await generator(body)

  return Array.prototype.map
    .call(new Uint8Array(result), (x) => x.toString(16).padStart(2, '0'))
    .join('')
}
