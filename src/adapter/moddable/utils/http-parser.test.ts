import { findHeaderEnd, parseHTTP } from "./http-parser"

const encoder = new TextEncoder()

describe('findHeaderEnd', () => {
  it('Should find the end of headers in a valid HTTP request', () => {
    const headerPart = 'GET / HTTP/1.1\r\nHost: example.com\r\nConnection: keep-alive\r\n\r\n'
    const request = encoder.encode(headerPart)
    const endIndex = findHeaderEnd(request)
    expect(endIndex).toBe(headerPart.length)
  })
  it('Should return -1 if no end of headers is found', () => {
    const request = encoder.encode('GET / HTTP/1.1\r\nHost: example.com\r\nConnection: keep-alive')
    const endIndex = findHeaderEnd(request)
    expect(endIndex).toBe(-1)
  })
})

describe('parseHTTP', () => {
  it('Should parse a valid HTTP request', async () => {
    const headerPart = 'POST / HTTP/1.1\r\nHost: example.com\r\nConnection: keep-alive\r\n\r\n'
    const bodyPart = 'Hello, world!'
    const request = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(headerPart))
        controller.enqueue(encoder.encode(bodyPart))
        controller.close()
      },
    })
    const result = await parseHTTP(request)
    expect(result?.method).toEqual('POST')
    expect(result?.path).toEqual('/')
    expect(result?.version).toEqual('HTTP/1.1')
    expect(result?.headers).toEqual({
      'host': 'example.com',
      'connection': 'keep-alive',
    })
    expect(await new Response(result?.body).text()).toEqual(bodyPart)
  })
  it('Should return null for an invalid HTTP request', async () => {
    const request = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('INVALID REQUEST'))
        controller.close()
      },
    })
    const result = await parseHTTP(request)
    expect(result).toBeNull()
  })
  it('Should return null for empty first line', async () => {
    const request = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('\r\nHost: example.com\r\nConnection: keep-alive\r\n\r\n'))
        controller.close()
      },
    })
    const result = await parseHTTP(request)
    expect(result).toBeNull()
  })
  it('Should return null for empty HTTP version', async () => {
    const request = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('GET\r\nHost: example.com\r\nConnection: keep-alive\r\n\r\n'))
        controller.close()
      },
    })
    const result = await parseHTTP(request)
    expect(result).toBeNull()
  })
  it('Should return null for HTTP version other than HTTP/1.1', async () => {
    const request = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('GET / HTTP/2.0\r\nHost: example.com\r\nConnection: keep-alive\r\n\r\n'))
        controller.close()
      },
    })
    const result = await parseHTTP(request)
    expect(result).toBeNull()
  })
  it('Should skip header line for invalid header lines', async () => {
    const request = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('GET / HTTP/1.1\r\nHost example.com\r\nConnection: keep-alive\r\n\r\n'))
        controller.close()
      },
    })
    const result = await parseHTTP(request)
    expect(result?.headers).toEqual({
      'connection': 'keep-alive',
    })
  })
})
