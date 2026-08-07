export const generateDigest = async (
  stream: ReadableStream<Uint8Array<ArrayBuffer>> | null,
  generator: (body: Uint8Array<ArrayBuffer>) => ArrayBuffer | Promise<ArrayBuffer>
): Promise<string | null> => {
  if (!stream) {
    return null
  }

  const chunks: Uint8Array<ArrayBuffer>[] = []
  let totalLength = 0

  const reader = stream.getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
    totalLength += value.byteLength
  }

  if (chunks.length === 0) {
    return null
  }

  const merged = new Uint8Array<ArrayBuffer>(new ArrayBuffer(totalLength))
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }

  const result = await generator(merged)

  return Array.prototype.map
    .call(new Uint8Array(result), (x) => x.toString(16).padStart(2, '0'))
    .join('')
}
