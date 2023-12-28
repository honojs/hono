import type { Context } from '../../context'
import { StreamingApi } from '../../utils/stream'

export const stream = (c: Context, cb: (stream: StreamingApi) => Promise<void>): Response => {
  const transformer = new TransformStream()
  const stream = new StreamingApi(transformer.writable, transformer.readable)
  cb(stream).finally(() => stream.close())
  return c.newResponse(stream.readable)
}
