import type { Context } from '../../context'
import { StreamingApi } from '../../utils/stream'

const contextStash: WeakMap<ReadableStream, Context> = new WeakMap<ReadableStream, Context>()
export const stream = (
  c: Context,
  cb: (stream: StreamingApi) => Promise<void>,
  onError?: (e: Error, stream: StreamingApi) => Promise<void>
): Response => {
  const { readable, writable } = new TransformStream()
  const stream = new StreamingApi(writable, readable)

  // bun does not cancel response stream when request is canceled, so detect abort by signal
  c.req.raw.signal.addEventListener('abort', () => {
    if (!stream.closed) {
      stream.abort()
    }
  })
  // in bun, `c` is destroyed when the request is returned, so hold it until the end of streaming
  contextStash.set(stream.responseReadable, c)
  ;(async () => {
    try {
      await cb(stream)
    } catch (e) {
      if (e === undefined) {
        // If reading is canceled without a reason value (e.g. by StreamingApi)
        // then the .pipeTo() promise will reject with undefined.
        // In this case, do nothing because the stream is already closed.
      } else if (e instanceof Error && onError) {
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
