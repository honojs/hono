/**
 * Minimal HTTP/1.1 codec for serving over a WinterTC socket.
 * @module
 */

const CR = 13
const LF = 10

const encoder = new TextEncoder()
const latin1Decoder = new TextDecoder('latin1')

const TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
const REQUEST_LINE_RE = /^([!#$%&'*+\-.^_`|~0-9A-Za-z]+) (\S+) HTTP\/(\d)\.(\d)$/
const HOST_RE = /^(?:\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9\-._~%!$&'()*+,;=]+)(?::\d*)?$/

const errorReasons: Record<number, string> = {
  400: 'Bad Request',
  431: 'Request Header Fields Too Large',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  505: 'HTTP Version Not Supported',
}

/**
 * An error in the request framing, answered with `status` before closing the connection.
 */
export class HttpParseError extends Error {
  readonly status: number
  constructor(status: number, message?: string) {
    super(message ?? errorReasons[status])
    this.status = status
  }
}

const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  if (a.length === 0) {
    return b
  }
  const merged = new Uint8Array(a.length + b.length)
  merged.set(a)
  merged.set(b, a.length)
  return merged
}

/**
 * Reads from a byte stream while keeping bytes that belong to the next message.
 */
export class BufferedReader {
  #reader: ReadableStreamDefaultReader<Uint8Array>
  #buffer: Uint8Array = new Uint8Array(0)
  #eof = false

  constructor(readable: ReadableStream<Uint8Array>) {
    this.#reader = readable.getReader()
  }

  async #fill(): Promise<boolean> {
    while (!this.#eof) {
      const { done, value } = await this.#reader.read()
      if (done) {
        this.#eof = true
      } else if (value.length) {
        this.#buffer = concat(this.#buffer, value)
        return true
      }
    }
    return false
  }

  /**
   * Reads the request line and headers, without the terminating empty line.
   * Returns `null` when the stream ends cleanly before a new message starts.
   */
  async readHead(maxSize: number): Promise<Uint8Array | null> {
    let scanned = 0
    for (;;) {
      // ignore empty lines preceding the request line (RFC 9112 Section 2.2)
      while (this.#buffer[0] === CR || this.#buffer[0] === LF) {
        this.#buffer = this.#buffer.subarray(1)
        scanned = 0
      }
      const buffer = this.#buffer
      for (let i = Math.max(scanned - 3, 0); i + 3 < buffer.length; i++) {
        if (
          buffer[i] === CR &&
          buffer[i + 1] === LF &&
          buffer[i + 2] === CR &&
          buffer[i + 3] === LF
        ) {
          if (i > maxSize) {
            throw new HttpParseError(431)
          }
          this.#buffer = buffer.subarray(i + 4)
          return buffer.subarray(0, i)
        }
      }
      scanned = buffer.length
      if (scanned > maxSize) {
        throw new HttpParseError(431)
      }
      if (!(await this.#fill())) {
        if (this.#buffer.length === 0) {
          return null
        }
        throw new HttpParseError(400, 'Unexpected end of request head')
      }
    }
  }

  /**
   * Reads a CRLF-terminated line, without the CRLF.
   */
  async readLine(maxSize: number): Promise<string> {
    let scanned = 0
    for (;;) {
      const buffer = this.#buffer
      for (let i = Math.max(scanned - 1, 0); i + 1 < buffer.length; i++) {
        if (buffer[i] === CR && buffer[i + 1] === LF) {
          this.#buffer = buffer.subarray(i + 2)
          return latin1Decoder.decode(buffer.subarray(0, i))
        }
      }
      scanned = buffer.length
      if (scanned > maxSize) {
        throw new HttpParseError(400, 'Line too long')
      }
      if (!(await this.#fill())) {
        throw new HttpParseError(400, 'Unexpected end of body')
      }
    }
  }

  /**
   * Reads at most `maxLength` bytes. Returns `null` at the end of the stream.
   */
  async read(maxLength: number): Promise<Uint8Array | null> {
    if (this.#buffer.length === 0 && !(await this.#fill())) {
      return null
    }
    const buffer = this.#buffer
    if (buffer.length <= maxLength) {
      this.#buffer = new Uint8Array(0)
      return buffer
    }
    this.#buffer = buffer.subarray(maxLength)
    return buffer.subarray(0, maxLength)
  }

  release(): void {
    try {
      this.#reader.releaseLock()
    } catch {
      // the lock may already be released
    }
  }
}

export interface RequestHead {
  method: string
  target: string
  /** `0` for HTTP/1.0, `1` for HTTP/1.1 */
  minorVersion: 0 | 1
  headers: Headers
}

/**
 * Parses the request line and header fields.
 */
export const parseRequestHead = (head: Uint8Array): RequestHead => {
  const lines = latin1Decoder.decode(head).split('\r\n')
  const match = REQUEST_LINE_RE.exec(lines[0])
  if (!match) {
    throw new HttpParseError(400, 'Malformed request line')
  }
  const [, method, target, major, minor] = match
  if (major !== '1' || (minor !== '0' && minor !== '1')) {
    throw new HttpParseError(505)
  }

  const headers = new Headers()
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const colon = line.indexOf(':')
    // a missing colon, whitespace before it or obs-fold is rejected (RFC 9112 Section 5)
    if (colon <= 0) {
      throw new HttpParseError(400, 'Malformed header field')
    }
    const name = line.slice(0, colon)
    if (!TOKEN_RE.test(name)) {
      throw new HttpParseError(400, 'Malformed header field')
    }
    try {
      headers.append(name, line.slice(colon + 1).trim())
    } catch {
      throw new HttpParseError(400, 'Malformed header field')
    }
  }

  return { method, target, minorVersion: minor === '1' ? 1 : 0, headers }
}

/**
 * Builds the request URL from the request target and the `Host` header.
 */
export const buildRequestUrl = (
  { target, minorVersion, headers }: RequestHead,
  scheme: string
): string => {
  if (/^https?:\/\//i.test(target)) {
    // absolute-form
    try {
      return new URL(target).href
    } catch {
      throw new HttpParseError(400, 'Malformed request target')
    }
  }
  if (target[0] !== '/') {
    throw new HttpParseError(400, 'Malformed request target')
  }
  const host = headers.get('host')
  if (host === null) {
    if (minorVersion === 1) {
      throw new HttpParseError(400, 'Missing Host header')
    }
  } else if (!HOST_RE.test(host)) {
    throw new HttpParseError(400, 'Malformed Host header')
  }
  try {
    return new URL(`${scheme}://${host || 'localhost'}${target}`).href
  } catch {
    throw new HttpParseError(400, 'Malformed request target')
  }
}

/**
 * Produces the decoded chunks of a request body.
 */
export interface BodyDecoder {
  /** Returns the next chunk of the body, or `null` once it is complete. */
  next(): Promise<Uint8Array | null>
  readonly done: boolean
}

const fixedLengthDecoder = (reader: BufferedReader, length: number): BodyDecoder => {
  let remaining = length
  return {
    get done() {
      return remaining === 0
    },
    async next() {
      if (remaining === 0) {
        return null
      }
      const chunk = await reader.read(remaining)
      if (!chunk) {
        throw new HttpParseError(400, 'Unexpected end of body')
      }
      remaining -= chunk.length
      return chunk
    },
  }
}

const chunkedDecoder = (reader: BufferedReader, maxLineSize: number): BodyDecoder => {
  let remaining = 0
  let done = false
  return {
    get done() {
      return done
    },
    async next() {
      if (done) {
        return null
      }
      if (remaining === 0) {
        const sizeLine = await reader.readLine(maxLineSize)
        const size = sizeLine.split(';', 1)[0].trim()
        if (!/^[0-9A-Fa-f]{1,12}$/.test(size)) {
          throw new HttpParseError(400, 'Malformed chunk size')
        }
        remaining = parseInt(size, 16)
        if (remaining === 0) {
          // discard trailer fields
          while ((await reader.readLine(maxLineSize)) !== '') {
            // continue
          }
          done = true
          return null
        }
      }
      const chunk = await reader.read(remaining)
      if (!chunk) {
        throw new HttpParseError(400, 'Unexpected end of body')
      }
      remaining -= chunk.length
      if (remaining === 0 && (await reader.readLine(maxLineSize)) !== '') {
        throw new HttpParseError(400, 'Malformed chunk')
      }
      return chunk
    },
  }
}

/**
 * Returns a decoder for the request body as framed by RFC 9112 Section 6.3,
 * or `null` if the request has no body.
 */
export const createBodyDecoder = (
  reader: BufferedReader,
  headers: Headers,
  maxLineSize: number
): BodyDecoder | null => {
  const transferEncoding = headers.get('transfer-encoding')
  const contentLength = headers.get('content-length')
  if (transferEncoding !== null) {
    if (contentLength !== null) {
      throw new HttpParseError(400, 'Both Transfer-Encoding and Content-Length are present')
    }
    if (transferEncoding.trim().toLowerCase() !== 'chunked') {
      throw new HttpParseError(501, 'Unsupported Transfer-Encoding')
    }
    return chunkedDecoder(reader, maxLineSize)
  }
  if (contentLength !== null) {
    // repeated identical values are joined by `Headers`, e.g. `5, 5`
    const values = new Set(contentLength.split(',').map((v) => v.trim()))
    const [value] = values
    if (values.size !== 1 || !/^\d{1,15}$/.test(value)) {
      throw new HttpParseError(400, 'Malformed Content-Length')
    }
    const length = Number(value)
    return length === 0 ? null : fixedLengthDecoder(reader, length)
  }
  return null
}

/**
 * Whether the `Connection` header contains `option`.
 */
export const hasConnectionOption = (headers: Headers, option: string): boolean =>
  headers
    .get('connection')
    ?.split(',')
    .some((v) => v.trim().toLowerCase() === option) ?? false

const CONTINUE = encoder.encode('HTTP/1.1 100 Continue\r\n\r\n')

export const writeContinue = (writer: WritableStreamDefaultWriter<Uint8Array>): Promise<void> =>
  writer.write(CONTINUE)

export const writeErrorResponse = (
  writer: WritableStreamDefaultWriter<Uint8Array>,
  status: number
): Promise<void> =>
  writer.write(
    encoder.encode(
      `HTTP/1.1 ${status} ${errorReasons[status] ?? ''}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`
    )
  )

// hop-by-hop fields this codec manages itself
const skippedResponseHeaders = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'set-cookie',
])

export interface WriteResponseOptions {
  method: string
  minorVersion: 0 | 1
  keepAlive: boolean
}

/**
 * Serializes `res` to `writer`.
 * Returns whether the connection can be reused for another request.
 */
export const writeResponse = async (
  writer: WritableStreamDefaultWriter<Uint8Array>,
  res: Response,
  { method, minorVersion, keepAlive }: WriteResponseOptions
): Promise<boolean> => {
  const status = res.status
  const bodyless = method === 'HEAD' || status < 200 || status === 204 || status === 304
  const body = bodyless ? null : res.body

  let head = `HTTP/1.1 ${status} ${res.statusText}\r\n`
  let hasContentLength = false
  res.headers.forEach((value, name) => {
    if (skippedResponseHeaders.has(name)) {
      return
    }
    if (name === 'content-length') {
      if (status < 200 || status === 204) {
        return
      }
      hasContentLength = true
    }
    head += `${name}: ${value}\r\n`
  })
  for (const cookie of res.headers.getSetCookie()) {
    head += `set-cookie: ${cookie}\r\n`
  }

  let chunked = false
  if (!bodyless && !hasContentLength) {
    if (!body) {
      head += 'content-length: 0\r\n'
    } else if (minorVersion === 1) {
      chunked = true
      head += 'transfer-encoding: chunked\r\n'
    } else {
      // HTTP/1.0 without a length: the body ends when the connection closes
      keepAlive = false
    }
  }
  if (!keepAlive) {
    head += 'connection: close\r\n'
  } else if (minorVersion === 0) {
    head += 'connection: keep-alive\r\n'
  }
  head += '\r\n'

  if (bodyless) {
    await res.body?.cancel().catch(() => {})
  }
  await writer.write(encoder.encode(head))
  if (!body) {
    return keepAlive
  }

  const reader = body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!value.length) {
        continue
      }
      if (chunked) {
        await writer.write(encoder.encode(`${value.length.toString(16)}\r\n`))
        await writer.write(value)
        await writer.write(encoder.encode('\r\n'))
      } else {
        await writer.write(value)
      }
    }
  } catch (e) {
    await reader.cancel(e).catch(() => {})
    throw e
  }
  if (chunked) {
    await writer.write(encoder.encode('0\r\n\r\n'))
  }
  return keepAlive
}
