import type { Context } from '../../context'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../../utils/html'
import { StreamingApi } from '../../utils/stream'
import { isOldBunVersion } from './utils'

export interface SSEMessage {
  data: string | Promise<string>
  event?: string
  id?: string
  retry?: number
}

export class SSEStreamingApi extends StreamingApi {
  constructor(writable: WritableStream, readable: ReadableStream) {
    super(writable, readable)
  }

  async writeSSE(message: SSEMessage) {
    const data = await resolveCallback(message.data, HtmlEscapedCallbackPhase.Stringify, false, {})
    const dataLines = (data as string)
      .split(/\r\n|\r|\n/)
      .map((line) => {
        return `data: ${line}`
      })
      .join('\n')

    const sseData =
      [
        message.event && `event: ${message.event}`,
        dataLines,
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
  }
}

const contextStash: WeakMap<ReadableStream, Context> = new WeakMap<ReadableStream, Context>()

export const streamSSE = (
  c: Context,
  cb: (stream: SSEStreamingApi) => Promise<void>,
  onError?: (e: Error, stream: SSEStreamingApi) => Promise<void>
): Response => {
  const { readable, writable } = new TransformStream()
  const stream = new SSEStreamingApi(writable, readable)

  // Until Bun v1.1.27, Bun didn't call cancel() on the ReadableStream for Response objects from Bun.serve()
  if (isOldBunVersion()) {
    c.req.raw.signal.addEventListener('abort', () => {
      if (!stream.closed) {
        stream.abort()
      }
    })
  }

  // in bun, `c` is destroyed when the request is returned, so hold it until the end of streaming
  contextStash.set(stream.responseReadable, c)

  c.header('Transfer-Encoding', 'chunked')
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  run(stream, cb, onError)

  return c.newResponse(stream.responseReadable)
}
