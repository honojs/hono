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
  let chunk: Uint8Array<ArrayBuffer> | undefined = undefined
  let buf: Uint8Array<ArrayBuffer> | undefined = undefined
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

      // Fast Path 1: Buffer is empty and incoming chunk is >= 256 KB
      if (chunkLength === 0 && remaining >= CHUNK_SIZE) {
        await digest(value.subarray(offset, offset + CHUNK_SIZE))
        offset += CHUNK_SIZE
        continue
      }

      // Fast Path 2: First partial chunk (0 allocations if stream ends here)
      if (chunkLength === 0 && !chunk && !buf) {
        const length = Math.min(remaining, CHUNK_SIZE)
        chunk = value.subarray(offset, offset + length)
        chunkLength = length
        offset += length
        if (chunkLength === CHUNK_SIZE) {
          await digest(chunk)
          chunk = undefined
          chunkLength = 0
        }
        continue
      }

      // Multi-chunk path: Lazily allocate 256 KB buffer once and accumulate
      if (!buf) {
        buf = new Uint8Array<ArrayBuffer>(new ArrayBuffer(CHUNK_SIZE))
        if (chunk && chunkLength > 0) {
          buf.set(chunk.subarray(0, chunkLength), 0)
          chunk = undefined
        }
      }

      const length = Math.min(remaining, CHUNK_SIZE - chunkLength)
      buf.set(value.subarray(offset, offset + length), chunkLength)
      chunkLength += length
      offset += length

      if (chunkLength === CHUNK_SIZE) {
        await digest(buf)
        chunkLength = 0
      }
    }
  }

  if (chunkLength > 0) {
    const finalChunk = buf ?? chunk
    if (finalChunk) {
      await digest(finalChunk.subarray(0, chunkLength))
    }
  }

  if (!result) {
    return null
  }

  return Array.prototype.map
    .call(new Uint8Array(result), (x) => x.toString(16).padStart(2, '0'))
    .join('')
}
