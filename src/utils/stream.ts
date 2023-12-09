export class StreamingApi {
  private writer: WritableStreamDefaultWriter<Uint8Array>
  private encoder: TextEncoder
  private writable: WritableStream
  private subscribeAbort?: (listener: () => void | Promise<void>) => void

  constructor(
    writable: WritableStream,
    subscribeAbort?: (listener: () => void | Promise<void>) => void
  ) {
    this.writable = writable
    this.writer = writable.getWriter()
    this.encoder = new TextEncoder()
    this.subscribeAbort = subscribeAbort
  }

  async write(input: Uint8Array | string) {
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

  async writeln(input: string) {
    await this.write(input + '\n')
    return this
  }

  sleep(ms: number) {
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

  async onAbort(listener: () => void | Promise<void>) {
    this.subscribeAbort?.(listener)
  }
}
