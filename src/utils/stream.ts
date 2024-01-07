import { HtmlEscapedCallbackPhase, resolveCallback } from './html'

export class StreamingApi {
  private writer: WritableStreamDefaultWriter<Uint8Array>
  private encoder: TextEncoder
  private writable: WritableStream
  private abortSubscribers: (() => void | Promise<void>)[] = []
  responseReadable: ReadableStream

  constructor(writable: WritableStream, _readable: ReadableStream) {
    this.writable = writable
    this.writer = writable.getWriter()
    this.encoder = new TextEncoder()

    const reader = _readable.getReader()

    this.responseReadable = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      },
      cancel: () => {
        this.abortSubscribers.forEach((subscriber) => subscriber())
      },
    })
  }

  async write(input: Uint8Array | string | Promise<string>) {
    try {
      // JSX handling is a same process as c.html
      if (typeof input === 'object' && !(input instanceof Uint8Array)) {
        // this is a JSXNode
        if (!(input instanceof Promise)) {
          input = (input as string).toString() // HtmlEscapedString object to string
        }
        if (input instanceof Promise) {
          ;(input as unknown as Promise<string>)
            .then((html) => resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}))
            .then((html) => this.write(html))
          return this
        }
      }
      if (typeof input === 'string') {
        input = this.encoder.encode(input.toString())
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
    this.abortSubscribers.push(listener)
  }
}
