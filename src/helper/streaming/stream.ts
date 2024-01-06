import type { Context } from '../../context'
import { StreamingApi } from '../../utils/stream'

export const stream = (c: Context, cb: (stream: StreamingApi) => Promise<void>): Response => {
  const { readable, writable } = new TransformStream()
  const stream = new StreamingApi(writable, readable)
  cb(stream).finally(() => stream.close())
  return c.newResponse(stream.responseReadable)
}
