import type { Context } from '../../context'
import { StreamingApi } from '../../utils/stream'

interface SSEMessage {
  data: string
  event?: string
  id?: string
}

class SSEStreamingApi extends StreamingApi {
  constructor(originalStream: StreamingApi) {
    super(originalStream['writable']) // Accessing the private writable property - normally not recommended but works for this specific solution.
  }

  async writeSse(message: SSEMessage) {
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

function setSSEHeaders(context: Context) {
  context.set('Transfer-Encoding', 'chunked')
  context.set('Content-Type', 'text/event-stream')
  context.set('Cache-Control', 'no-cache')
  context.set('Connection', 'keep-alive')
}

export const streamAsSSE = (c: Context, cb: (stream: SSEStreamingApi) => Promise<void>) => {
  return c.stream(async (originalStream: StreamingApi) => {
    const stream = new SSEStreamingApi(originalStream)
    setSSEHeaders(c)
    
    try {
      await cb(stream)
    } catch (err) {
      console.error('Error during streaming: ', err)
      stream.close()
    }
  })
}
