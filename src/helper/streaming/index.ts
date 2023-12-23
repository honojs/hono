import type { Context, HeaderRecord } from '../../context'
import type { StatusCode } from '../../utils/http-status'
import { StreamingApi } from '../../utils/stream'

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

export { streamSSE } from './sse'
export { streamText } from './text'
