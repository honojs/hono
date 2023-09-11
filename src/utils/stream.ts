export class StreamingApi {
  private writer: WritableStreamDefaultWriter<Uint8Array>
  private encoder: TextEncoder
  buffer: string[] = []

  constructor(writable: WritableStream<Uint8Array>) {
    this.writer = writable.getWriter()
    this.encoder = new TextEncoder()
  }

  write(str: string): StreamingApi {
    this.buffer.push(str)
    return this
  }

  writeln(str: string): StreamingApi {
    return this.write(str + '\n')
  }

  clear(): void {
    this.buffer = []
  }

  async flush(): Promise<void> {
    const text = this.buffer.join('')
    const encoded = this.encoder.encode(text)
    await this.writer.write(encoded)
    this.clear()
  }

  async close(): Promise<void> {
    await this.writer.close()
    this.clear()
  }
}
