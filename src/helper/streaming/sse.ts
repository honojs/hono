import type { Context } from '../../context'
import { StreamingApi } from '../../utils/stream'

export interface SSEMessage {
  data: string
  event?: string
  id?: string
  retry?: number
}

export class SSEStreamingApi extends StreamingApi {
  constructor(writable: WritableStream, readable: ReadableStream) {
    super(writable, readable)
  }

  async writeSSE(message: SSEMessage) {
    const data = message.data
      .split('\n')
      .map((line) => {
        return `data: ${line}`
      })
      .join('\n')

    const sseData =
      [
        message.event && `event: ${message.event}`,
        data,
        message.id && `id: ${message.id}`,
        message.retry && `retry: ${message.retry}`,
      ]
        .filter(Boolean)
        .join('\n') + '\n\n'

    await this.write(sseData)
  }
}

const run = async (
  stream: SSEStreamingApi,
  cb: (stream: SSEStreamingApi) => Promise<void>,
  onError?: (e: Error, stream: SSEStreamingApi) => Promise<void>
): Promise<void> => {
  try {
    await cb(stream)
  } catch (e) {
    if (e instanceof Error && onError) {
      await onError(e, stream)

      await stream.writeSSE({
        event: 'error',
        data: e.message,
      })
    } else {
      console.error(e)
    }
  } finally {
    stream.close()
  }
}

const contextStash = new WeakMap<ReadableStream, Context>()
export const streamSSE = (
  c: Context,
  cb: (stream: SSEStreamingApi) => Promise<void>,
  onError?: (e: Error, stream: SSEStreamingApi) => Promise<void>
): Response => {
  const { readable, writable } = new TransformStream()
  const stream = new SSEStreamingApi(writable, readable)

  // bun does not cancel response stream when request is canceled, so detect abort by signal
  c.req.raw.signal.addEventListener('abort', () => {
    stream.abort()
  })
  // in bun, `c` is destroyed when the request is returned, so hold it until the end of streaming
  contextStash.set(stream.responseReadable, c)

  c.header('Transfer-Encoding', 'chunked')
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  run(stream, cb, onError)

  return c.newResponse(stream.responseReadable)
}
