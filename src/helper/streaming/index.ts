import { Context, HeaderRecord, TEXT_PLAIN } from '../../context'
import { StatusCode } from '../../utils/http-status'
import { StreamingApi } from '../../utils/stream'

export { streamSSE } from './sse'

export const streamText = (
  c: Context,
  cb: (stream: StreamingApi) => Promise<void>,
  arg?: StatusCode | ResponseInit,
  headers?: HeaderRecord
): Response => {
  headers ??= {}
  c.header('content-type', TEXT_PLAIN)
  c.header('x-content-type-options', 'nosniff')
  c.header('transfer-encoding', 'chunked')
  return stream(c, cb, arg, headers)
}

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
