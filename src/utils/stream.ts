export class StreamingApi {
  private writer: WritableStreamDefaultWriter<Uint8Array>
  private encoder: TextEncoder
  private writable: WritableStream

  constructor(writable: WritableStream) {
    this.writable = writable
    this.writer = writable.getWriter()
    this.encoder = new TextEncoder()
  }

  async write(bytes?: Uint8Array | string) {
    if (typeof bytes === 'string') {
      bytes = this.encoder.encode(bytes)
    }
    await this.writer.write(bytes)
    return this
  }

  async writeln(bytes?: string) {
    await this.write((bytes || '') + '\n')
    return this
  }

  async log(arg: any) {
    await this.writeln(JSON.stringify(arg))
    return this
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
