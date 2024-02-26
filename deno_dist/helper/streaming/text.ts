import type { Context } from '../../context.ts'
import { TEXT_PLAIN } from '../../context.ts'
import type { StreamingApi } from '../../utils/stream.ts'
import { stream } from './index.ts'

export const streamText = (
  c: Context,
  cb: (stream: StreamingApi) => Promise<void>,
  onError?: (e: Error, stream: StreamingApi) => Promise<void>
): Response => {
  c.header('Content-Type', TEXT_PLAIN)
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Transfer-Encoding', 'chunked')
  return stream(c, cb, onError)
}
