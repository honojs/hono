import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { streamText } from '.'
import type { CompressionOptions } from '.'
import { createGzip } from 'zlib'
import { Readable } from 'stream'

const gzipStream = () => {
  const gzip = createGzip()
  const source = Readable.from(['Hello, world!'])
  source.pipe(gzip)
  return gzip
}

describe('Text Streaming Helper', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('Check streamText Response', async () => {
    const res = streamText(c, async (stream) => {
      for (let i = 0; i < 3; i++) {
        await stream.write(`${i}`)
        await stream.sleep(1)
      }
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('transfer-encoding')).toBe('chunked')

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (let i = 0; i < 3; i++) {
      const { value } = await reader.read()
      expect(decoder.decode(value)).toEqual(`${i}`)
    }
  })

  it('Check compressed streamText Response', async () => {
    const options: CompressionOptions = { compress: true, format: 'gzip' }
    const res = streamText(
      c,
      async (stream) => {
        for (let i = 0; i < 3; i++) {
          await stream.write(`${i}`)
          await stream.sleep(1)
        }
      },
      undefined,
      options
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('transfer-encoding')).toBe('chunked')

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const compressedData = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      compressedData.push(...value)
    }
    expect(compressedData.length).toBeGreaterThan(3)
  })

  it('Check decompressed streamText Response', async () => {
    const options: CompressionOptions = { decompress: true, format: 'gzip' }
    const res = streamText(
      c,
      async (stream) => {
        const compressedStream = new ReadableStream({
          start(controller) {
            const gzip = gzipStream()
            gzip.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)))
            gzip.on('end', () => controller.close())
          },
        })
        await stream.pipe(compressedStream)
      },
      undefined,
      options
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('transfer-encoding')).toBe('chunked')

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const decompressedData = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      decompressedData.push(...value)
    }
    const result = decoder.decode(new Uint8Array(decompressedData))
    expect(result).toEqual('Hello, world!')
  })

  it('Check invalid compression and decompression options for streamText', () => {
    const options: CompressionOptions = { compress: true, decompress: true, format: 'gzip' }
    expect(() =>
      streamText(
        c,
        async (stream) => {
          for (let i = 0; i < 3; i++) {
            await stream.write(`${i}`)
            await stream.sleep(1)
          }
        },
        undefined,
        options
      )
    ).toThrow('Compression and decompression cannot be enabled simultaneously.')
  })
})
