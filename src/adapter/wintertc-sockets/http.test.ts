import { BufferedReader, HttpParseError, createBodyDecoder, parseRequestHead } from './http'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const streamOf = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })

describe('parseRequestHead', () => {
  it('Should parse the request line and headers', () => {
    const head = parseRequestHead(
      encoder.encode('PUT /a?b=c HTTP/1.0\r\nHost: example.com\r\nX-Foo:  bar \r\nX-Foo: baz')
    )
    expect(head.method).toBe('PUT')
    expect(head.target).toBe('/a?b=c')
    expect(head.minorVersion).toBe(0)
    expect(head.headers.get('host')).toBe('example.com')
    expect(head.headers.get('x-foo')).toBe('bar, baz')
  })

  it.each([
    ['GET /  HTTP/1.1', 400],
    ['GET / HTTP/1.1\r\nName : value', 400],
    ['GET / HTTP/1.1\r\nno-colon', 400],
    ['GET / HTTP/3.0', 505],
    ['GET / HTTP/1.2', 505],
  ])('Should reject %j with %i', (head, status) => {
    expect(() => parseRequestHead(encoder.encode(head))).toThrow(
      expect.objectContaining({ status }) as unknown as HttpParseError
    )
  })
})

describe('BufferedReader', () => {
  it('Should find the end of the head across chunk boundaries', async () => {
    const reader = new BufferedReader(streamOf('GET / HTTP/1.1\r', '\n\r', '\nrest'))
    expect(decoder.decode((await reader.readHead(100))!)).toBe('GET / HTTP/1.1')
    expect(decoder.decode((await reader.read(10))!)).toBe('rest')
    expect(await reader.read(10)).toBeNull()
  })

  it('Should return null when the stream ends between messages', async () => {
    const reader = new BufferedReader(streamOf('\r\n'))
    expect(await reader.readHead(100)).toBeNull()
  })

  it('Should limit reads to the requested length', async () => {
    const reader = new BufferedReader(streamOf('abcdef'))
    expect(decoder.decode((await reader.read(4))!)).toBe('abcd')
    expect(decoder.decode((await reader.read(4))!)).toBe('ef')
  })
})

describe('createBodyDecoder', () => {
  const readBody = async (headers: HeadersInit, ...chunks: string[]) => {
    const reader = new BufferedReader(streamOf(...chunks))
    const body = createBodyDecoder(reader, new Headers(headers), 100)
    if (!body) {
      return null
    }
    let text = ''
    for (let chunk; (chunk = await body.next());) {
      text += decoder.decode(chunk)
    }
    expect(body.done).toBe(true)
    let rest = ''
    for (let chunk; (chunk = await reader.read(100));) {
      rest += decoder.decode(chunk)
    }
    return { text, rest }
  }

  it('Should return null without a body', async () => {
    expect(await readBody({})).toBeNull()
    expect(await readBody({ 'content-length': '0' })).toBeNull()
  })

  it('Should read exactly Content-Length bytes', async () => {
    expect(await readBody({ 'content-length': '5' }, 'hel', 'lonext')).toEqual({
      text: 'hello',
      rest: 'next',
    })
  })

  it('Should accept repeated identical Content-Length values', async () => {
    expect(await readBody({ 'content-length': '2, 2' }, 'hi')).toEqual({ text: 'hi', rest: '' })
  })

  it('Should decode a chunked body split at every position', async () => {
    const raw = '3\r\nabc\r\n2;x=y\r\nde\r\n0\r\nT: 1\r\n\r\nnext'
    for (let i = 0; i <= raw.length; i++) {
      expect(
        await readBody({ 'transfer-encoding': 'chunked' }, raw.slice(0, i), raw.slice(i))
      ).toEqual({ text: 'abcde', rest: 'next' })
    }
  })

  it.each([
    ['a truncated Content-Length body', { 'content-length': '5' }, 'abc'],
    ['an invalid chunk size', { 'transfer-encoding': 'chunked' }, 'x\r\n'],
    ['a missing CRLF after a chunk', { 'transfer-encoding': 'chunked' }, '1\r\naXX'],
    ['a truncated chunked body', { 'transfer-encoding': 'chunked' }, '5\r\nab'],
  ])('Should reject %s', async (_, headers, raw) => {
    await expect(readBody(headers, raw)).rejects.toBeInstanceOf(HttpParseError)
  })
})
