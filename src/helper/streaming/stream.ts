import type { Context } from '../../context'
import { StreamingApi } from '../../utils/stream'

export const stream = (
  c: Context,
  cb: (stream: StreamingApi) => Promise<void>,
  onError?: (e: Error, stream: StreamingApi) => Promise<void>
): Response => {
  const { readable, writable } = new TransformStream()
  const stream = new StreamingApi(writable, readable)

  // bun does not cancel response stream when request is canceled, so detect abort by signal
  c.req.raw.signal.addEventListener('abort', () => {
    // "referencing a `c` that is never null in a condition" is a work around for bun (maybe JIT).
    // If `c` is not referenced in this closure, this event will not fire.
    if (c) {
      stream.abort()
    }
  })
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
