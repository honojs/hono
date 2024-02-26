import type { Context } from '../../context'
import { TEXT_PLAIN } from '../../context'
import type { StreamingApi } from '../../utils/stream'
import { stream } from '.'

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
