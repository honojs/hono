import type { Context } from '../../context'
import { StreamingApi } from '../../utils/stream'

export interface CompressionOptions {
  compress?: boolean
  decompress?: boolean
  format?: CompressionFormat
}

export const stream = (
  c: Context,
  cb: (stream: StreamingApi) => Promise<void>,
  onError?: (e: Error, stream: StreamingApi) => Promise<void>,
  options?: CompressionOptions
): Response => {
  const { readable, writable } = new TransformStream()
  const stream = new StreamingApi(writable, readable, options)
  ;(async () => {
    try {
      await cb(stream)
    } catch (e) {
      if (e instanceof Error && onError) {
        await onError(e, stream)
      } else {
        console.error(e)
      }
    } finally {
      stream.close()
    }
  })()
  return c.newResponse(stream.responseReadable)
}
