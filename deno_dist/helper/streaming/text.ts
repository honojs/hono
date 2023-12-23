import type { Context, HeaderRecord } from '../../context.ts'
import { TEXT_PLAIN } from '../../context.ts'
import type { StatusCode } from '../../utils/http-status.ts'
import type { StreamingApi } from '../../utils/stream.ts'
import { stream } from './index.ts'

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
