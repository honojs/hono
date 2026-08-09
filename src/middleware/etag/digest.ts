const mergeBuffers = (
  buffer1: ArrayBuffer | undefined,
  buffer2: Uint8Array<ArrayBuffer>
): Uint8Array<ArrayBuffer> => {
  if (!buffer1) {
    return buffer2
  }
  const merged = new Uint8Array<ArrayBuffer>(
    new ArrayBuffer(buffer1.byteLength + buffer2.byteLength)
  )
  merged.set(new Uint8Array(buffer1), 0)
  merged.set(buffer2, buffer1.byteLength)
  return merged
}

const CHUNK_SIZE = 64 * 1024

export const generateDigest = async (
  stream: ReadableStream<Uint8Array<ArrayBuffer>> | null,
  generator: (body: Uint8Array<ArrayBuffer>) => ArrayBuffer | Promise<ArrayBuffer>
): Promise<string | null> => {
  if (!stream) {
    return null
  }

  let result: ArrayBuffer | undefined = undefined
  let chunk: Uint8Array<ArrayBuffer> | undefined
  let chunkLength = 0

  const reader = stream.getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    let offset = 0
    while (offset < value.byteLength) {
      chunk ??= new Uint8Array<ArrayBuffer>(new ArrayBuffer(CHUNK_SIZE))

      const length = Math.min(CHUNK_SIZE - chunkLength, value.byteLength - offset)
      chunk.set(value.subarray(offset, offset + length), chunkLength)
      chunkLength += length
      offset += length

      if (chunkLength === CHUNK_SIZE) {
        result = await generator(mergeBuffers(result, chunk))
        chunkLength = 0
      }
    }
  }

  if (chunk && chunkLength > 0) {
    result = await generator(mergeBuffers(result, chunk.subarray(0, chunkLength)))
  }

  if (!result) {
    return null
  }

  return Array.prototype.map
    .call(new Uint8Array(result), (x) => x.toString(16).padStart(2, '0'))
    .join('')
}
