import type { Context } from '../../context'
import { StreamingApi } from '../../utils/stream'

export const stream = (c: Context, cb: (stream: StreamingApi) => Promise<void>): Response => {
  const { readable, writable } = new TransformStream()
  const stream = new StreamingApi(writable)
  cb(stream).finally(() => stream.close())
  return c.newResponse(readable)
}

export { streamSSE } from './sse'
export { streamText } from './text'
