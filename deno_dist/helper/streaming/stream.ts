import type { Context } from '../../context.ts'
import { StreamingApi } from '../../utils/stream.ts'

export const stream = (c: Context, cb: (stream: StreamingApi) => Promise<void>): Response => {
  const { readable, writable } = new TransformStream()
  const stream = new StreamingApi(writable, readable)
  cb(stream).finally(() => stream.close())
  return c.newResponse(stream.responseReadable)
}
