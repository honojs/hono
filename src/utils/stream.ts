/**
 * @module
 * Stream utility.
 */

export class StreamingApi {
  private writer: WritableStreamDefaultWriter<Uint8Array>
  private encoder: TextEncoder
  private writable: WritableStream
  private abortSubscribers: (() => void | Promise<void>)[] = []
  responseReadable: ReadableStream

  constructor(
    writable: WritableStream,
    _readable: ReadableStream,
    options?: { compress?: boolean; decompress?: boolean; format?: CompressionFormat }
  ) {
    this.writable = writable
    this.writer = writable.getWriter()
    this.encoder = new TextEncoder()

    let reader = _readable.getReader()

    if (options?.decompress && options.format) {
      const decompressionStream = new DecompressionStream(options.format)
      reader = _readable.pipeThrough(decompressionStream).getReader()
    }

    // in case the user disconnects, let the reader know to cancel
    // this in-turn results in responseReadable being closed
    // and writeSSE method no longer blocks indefinitely
    this.abortSubscribers.push(async () => {
      await reader.cancel()
    })

    let responseStream: ReadableStream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read()
        done ? controller.close() : controller.enqueue(value)
      },
      cancel: () => {
        this.abortSubscribers.forEach((subscriber) => subscriber())
      },
    })

    if (options?.compress && options.format) {
      const compressionStream = new CompressionStream(options.format)
      responseStream = responseStream.pipeThrough(compressionStream)
    }

    this.responseReadable = responseStream
  }

  async write(input: Uint8Array | string): Promise<StreamingApi> {
    try {
      if (typeof input === 'string') {
        input = this.encoder.encode(input)
      }
      await this.writer.write(input)
    } catch (e) {
      // Do nothing. If you want to handle errors, create a stream by yourself.
    }
    return this
  }

  async writeln(input: string): Promise<StreamingApi> {
    await this.write(input + '\n')
    return this
  }

  sleep(ms: number): Promise<unknown> {
    return new Promise((res) => setTimeout(res, ms))
  }

  async close() {
    try {
      await this.writer.close()
    } catch (e) {
      // Do nothing. If you want to handle errors, create a stream by yourself.
    }
  }

  async pipe(body: ReadableStream) {
    this.writer.releaseLock()
    await body.pipeTo(this.writable, { preventClose: true })
    this.writer = this.writable.getWriter()
  }

  onAbort(listener: () => void | Promise<void>) {
    this.abortSubscribers.push(listener)
  }
}
