import type { Context } from '../../context.ts'
import { StreamingApi } from '../../utils/stream.ts'

interface SSEMessage {
  data: string
  event?: string
  id?: string
}

class SSEStreamingApi extends StreamingApi {
  constructor(writable: WritableStream) {
    super(writable)
  }

  async writeSSE(message: SSEMessage) {
    const sseData =
      [
        message.event && `event: ${message.event}`,
        message.id && `id: ${message.id}`,
        `data: ${message.data}`,
      ]
        .filter(Boolean)
        .join('\n') + '\n'

    await this.write(sseData)
  }
}

const setSSEHeaders = (context: Context) => {
  context.header('Transfer-Encoding', 'chunked')
  context.header('Content-Type', 'text/event-stream')
  context.header('Cache-Control', 'no-cache')
  context.header('Connection', 'keep-alive')
}

export const streamSSE = (c: Context, cb: (stream: SSEStreamingApi) => Promise<void>) => {
  return c.stream(async (originalStream: StreamingApi) => {
    const { readable, writable } = new TransformStream()
    const stream = new SSEStreamingApi(writable)
    originalStream.pipe(readable)
    setSSEHeaders(c)

    try {
      await cb(stream)
    } catch (err) {
      console.error('Error during streaming: ', err)
      stream.close()
    }
  })
}
