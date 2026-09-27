import { Writable } from 'node:stream'
import { streamHandle } from '../../src/adapter/aws-lambda/handler'
import type { LambdaContext } from '../../src/adapter/aws-lambda/types'
import { Hono } from '../../src/hono'

const awslambda = {
  streamifyResponse: <T>(handlerFunc: T): T => handlerFunc,
  HttpResponseStream: {
    from: (stream: Writable): Writable => stream,
  },
}

vi.stubGlobal('awslambda', awslambda)

type StreamingHandler = (
  event: unknown,
  responseStream: Writable,
  context: LambdaContext
) => Promise<void>

const CHUNK_SIZE = 16 * 1024
const CHUNK_COUNT = 128

const event = {
  headers: {},
  rawPath: '/',
  rawQueryString: '',
  body: null,
  isBase64Encoded: false,
  requestContext: { http: { method: 'GET' } },
}

describe('streamHandle backpressure', () => {
  it('should pace reads against the destination and resolve only once it has finished', async () => {
    let emittedChunks = 0
    let writtenBytes = 0
    let maxChunksAhead = 0

    const app = new Hono()
    app.get(
      '/',
      () =>
        new Response(
          new ReadableStream({
            pull(controller) {
              if (emittedChunks < CHUNK_COUNT) {
                emittedChunks++
                controller.enqueue(new Uint8Array(CHUNK_SIZE))
              } else {
                controller.close()
              }
            },
          })
        )
    )

    const responseStream = new Writable({
      highWaterMark: CHUNK_SIZE,
      write(buffer: Buffer, _encoding, callback) {
        maxChunksAhead = Math.max(maxChunksAhead, emittedChunks - writtenBytes / CHUNK_SIZE)
        setImmediate(() => {
          writtenBytes += buffer.length
          callback()
        })
      },
    })

    const handler = streamHandle(app) as unknown as StreamingHandler
    await handler(event, responseStream, {} as LambdaContext)

    expect(writtenBytes).toBe(CHUNK_SIZE * CHUNK_COUNT)
    expect(responseStream.writableFinished).toBe(true)
    expect(maxChunksAhead).toBeLessThan(CHUNK_COUNT / 2)
  })

  it('should report a body that errors mid-stream without rejecting', async () => {
    const app = new Hono()
    app.get(
      '/',
      () =>
        new Response(
          new ReadableStream({
            pull(controller) {
              controller.enqueue(new Uint8Array(CHUNK_SIZE))
              controller.error(new Error('body failed'))
            },
          })
        )
    )

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const responseStream = new Writable({
      write(_buffer, _encoding, callback) {
        setImmediate(callback)
      },
    })

    const handler = streamHandle(app) as unknown as StreamingHandler
    await expect(handler(event, responseStream, {} as LambdaContext)).resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalledWith(
      'Error processing request:',
      expect.objectContaining({ message: 'body failed' })
    )
    consoleError.mockRestore()
  })
})
