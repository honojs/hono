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

const CHUNK_SIZE = 256 * 1024

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

  const digest = async (body: Uint8Array<ArrayBuffer>) => {
    result = await generator(mergeBuffers(result, body))
  }

  const reader = stream.getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    let offset = 0
    while (offset < value.byteLength) {
      const remaining = value.byteLength - offset

      if (chunkLength === 0 && remaining >= CHUNK_SIZE) {
        await digest(value.subarray(offset, offset + CHUNK_SIZE))
        offset += CHUNK_SIZE
        continue
      }

      const requiredLength = chunkLength + remaining
      if (requiredLength < CHUNK_SIZE) {
        if (!chunk) {
          chunk = value.slice(offset)
        } else {
          if (chunk.byteLength < requiredLength) {
            const nextChunk = new Uint8Array<ArrayBuffer>(
              new ArrayBuffer(Math.min(CHUNK_SIZE, Math.max(requiredLength, chunk.byteLength * 2)))
            )
            nextChunk.set(chunk.subarray(0, chunkLength))
            chunk = nextChunk
          }
          chunk.set(value.subarray(offset), chunkLength)
        }
        chunkLength = requiredLength
        break
      }

      const length = CHUNK_SIZE - chunkLength
      if (chunk?.byteLength !== CHUNK_SIZE) {
        const nextChunk = new Uint8Array<ArrayBuffer>(new ArrayBuffer(CHUNK_SIZE))
        if (chunk) {
          nextChunk.set(chunk.subarray(0, chunkLength))
        }
        chunk = nextChunk
      }
      chunk.set(value.subarray(offset, offset + length), chunkLength)
      await digest(chunk)
      chunkLength = 0
      offset += length
    }
  }

  if (chunk && chunkLength > 0) {
    await digest(chunk.subarray(0, chunkLength))
  }

  if (!result) {
    return null
  }

  return Array.prototype.map
    .call(new Uint8Array(result), (x) => x.toString(16).padStart(2, '0'))
    .join('')
}
