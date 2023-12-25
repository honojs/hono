import type { Context } from '../../context'
import { TEXT_PLAIN } from '../../context'
import type { StreamingApi } from '../../utils/stream'
import { stream } from '.'

export const streamText = (c: Context, cb: (stream: StreamingApi) => Promise<void>): Response => {
  c.header('content-type', TEXT_PLAIN)
  c.header('x-content-type-options', 'nosniff')
  c.header('transfer-encoding', 'chunked')
  return stream(c, cb)
}
