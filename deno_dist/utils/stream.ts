export class StreamingApi {
  private writer: WritableStreamDefaultWriter<Uint8Array>
  private encoder: TextEncoder
  private writable: WritableStream

  constructor(writable: WritableStream) {
    this.writable = writable
    this.writer = writable.getWriter()
    this.encoder = new TextEncoder()
  }

  async write(input: Uint8Array | string) {
    if (typeof input === 'string') {
      input = this.encoder.encode(input)
    }
    await this.writer.write(input)
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
    await this.writer.close()
  }

  async pipe(body: ReadableStream) {
    this.writer.releaseLock()
    await body.pipeTo(this.writable, { preventClose: true })
    this.writer = this.writable.getWriter()
  }
}
