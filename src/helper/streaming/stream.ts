import type { Context } from '../../context'
import type { CompressionOptions } from '../../utils/stream'
import { StreamingApi } from '../../utils/stream'

export const stream = (
  c: Context,
  cb: (stream: StreamingApi) => Promise<void>,
  onError: (e: Error, stream: StreamingApi) => Promise<void> = async (e, stream) =>
    console.error(e),
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
