import type { Context } from '../../context.ts'
import { StreamingApi } from '../../utils/stream.ts'

interface SSEMessage {
  data: string
  event?: string
  id?: string
}

class SSEStreamingApi extends StreamingApi {
  async writeSSE(message: SSEMessage) {
    const data = message.data
      .split('\n')
      .map((line) => {
        return `data: ${line}`
      })
      .join('\n')

    const sseData = `${[
      message.event && `event: ${message.event}`,
      data,
      message.id && `id: ${message.id}`
    ]
      .filter(Boolean)
      .join('\n')}\n\n`

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

    originalStream.pipe(readable).catch((err) => {
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
