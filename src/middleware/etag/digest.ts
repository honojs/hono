/**
 * An incremental SHA-1 hasher.
 * `crypto.subtle.digest` is one-shot (there is no streaming Web Crypto API),
 * so this is only available on runtimes that expose a streaming primitive.
 */
type IncrementalSha1 = {
  update: (chunk: Uint8Array<ArrayBuffer>) => void
  digestHex: () => string
}

/**
 * Returns an incremental SHA-1 hasher when the runtime exposes one.
 *
 * - Bun: `Bun.CryptoHasher`
 * - Node.js: `node:crypto.createHash`, reached through
 *   `process.getBuiltinModule` instead of a static `node:` import so edge
 *   bundlers (e.g. Cloudflare Workers) can still skip it.
 *
 * Returns `null` on runtimes where Web Crypto is the only option (Cloudflare
 * Workers, older Node.js, Deno), in which case the caller falls back to
 * buffering the full body and hashing it once.
 */
const getIncrementalSha1 = (): IncrementalSha1 | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any

  if (typeof global.Bun !== 'undefined' && global.Bun.CryptoHasher) {
    const hasher = new global.Bun.CryptoHasher('sha1')
    return {
      update: (chunk) => hasher.update(chunk),
      digestHex: () => hasher.digest('hex') as string,
    }
  }

  const nodeCrypto = global?.process?.getBuiltinModule?.('node:crypto')
  if (nodeCrypto?.createHash) {
    const hasher = nodeCrypto.createHash('sha1')
    return {
      update: (chunk) => hasher.update(chunk),
      digestHex: () => hasher.digest('hex') as string,
    }
  }

  return null
}

const toHex = (buffer: ArrayBuffer) =>
  Array.prototype.map.call(new Uint8Array(buffer), (x) => x.toString(16).padStart(2, '0')).join('')

export const generateDigest = async (
  stream: ReadableStream<Uint8Array<ArrayBuffer>> | null,
  generator: (body: Uint8Array<ArrayBuffer>) => ArrayBuffer | Promise<ArrayBuffer>,
  useIncrementalSha1 = false
): Promise<string | null> => {
  if (!stream) {
    return null
  }

  const reader = stream.getReader()
  const sha1 = useIncrementalSha1 ? getIncrementalSha1() : null

  if (sha1) {
    let totalLength = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      totalLength += value.byteLength
      sha1.update(value)
    }
    if (totalLength === 0) {
      return null
    }
    return sha1.digestHex()
  }

  // No incremental primitive is available (e.g. Web Crypto only on Workers) or
  // a custom one-shot `generator` was provided: accumulate the full body and
  // hash it once, so the digest always matches a real hash of the content.
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let totalLength = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
    totalLength += value.byteLength
  }
  if (totalLength === 0) {
    return null
  }

  const fullBody = new Uint8Array<ArrayBuffer>(new ArrayBuffer(totalLength))
  let offset = 0
  for (const chunk of chunks) {
    fullBody.set(chunk, offset)
    offset += chunk.byteLength
  }

  const result = await generator(fullBody)
  return toHex(result)
}
