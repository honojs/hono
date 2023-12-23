import type { Context, HeaderRecord } from '../../context.ts'
import type { StatusCode } from '../../utils/http-status.ts'
import { StreamingApi } from '../../utils/stream.ts'

export const stream = (
  c: Context,
  cb: (stream: StreamingApi) => Promise<void>,
  arg?: StatusCode | ResponseInit,
  headers?: HeaderRecord
): Response => {
  const { readable, writable } = new TransformStream()
  const stream = new StreamingApi(writable)
  cb(stream).finally(() => stream.close())

  return typeof arg === 'number'
    ? c.newResponse(readable, arg, headers)
    : c.newResponse(readable, arg)
}

export { streamSSE } from './sse.ts'
export { streamText } from './text.ts'
