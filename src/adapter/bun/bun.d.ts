interface Bun {
  stdin: BunFile
  stdout: BunFile
  stderr: BunFile

  file(path: string | number | URL, options?: { type?: string }): BunFile

  write(
    destination: string | number | BunFile | URL,
    input: string | Blob | ArrayBuffer | SharedArrayBuffer | Response
  ): Promise<number>
}

interface BunFile {
  readonly size: number
  readonly type: string

  text(): Promise<string>
  stream(): ReadableStream
  arrayBuffer(): Promise<ArrayBuffer>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json(): Promise<any>
  writer(params: { highWaterMark?: number }): FileSink
}

export interface FileSink {
  write(chunk: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer): number
  flush(): number | Promise<number>
  end(error?: Error): number | Promise<number>
  start(options?: { highWaterMark?: number }): void
  ref(): void
  unref(): void
}
