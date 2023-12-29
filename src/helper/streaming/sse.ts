import type { Context } from '../../context'
import { StreamingApi } from '../../utils/stream'
import { stream } from '.'

export interface SSEMessage {
  data: string
  event?: string
  id?: string
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
      [message.event && `event: ${message.event}`, data, message.id && `id: ${message.id}`]
        .filter(Boolean)
        .join('\n') + '\n\n'

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
  return stream(c, async (originalStream: StreamingApi) => {
    const { readable, writable } = new TransformStream()
    const stream = new SSEStreamingApi(writable, readable)

    originalStream.pipe(stream.responseReadable).catch((err) => {
      console.error('Error in stream piping: ', err)
      stream.close()
    })

    setSSEHeaders(c)

    try {
      await cb(stream)
    } catch (err) {
      console.error('Error during streaming: ', err)
    } finally {
      await stream.close()
    }
  })
}
