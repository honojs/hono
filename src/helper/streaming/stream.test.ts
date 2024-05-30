import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { stream } from '.'
import type { CompressionOptions } from '.'
import { createGzip } from 'zlib'
import { Readable } from 'stream'

const gzipStream = () => {
  const gzip = createGzip()
  const source = Readable.from(['Hello, world!'])
  source.pipe(gzip)
  return gzip
}

describe('Basic Streaming Helper', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('Check stream Response', async () => {
    const res = stream(c, async (stream) => {
      for (let i = 0; i < 3; i++) {
        await stream.write(new Uint8Array([i]))
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    for (let i = 0; i < 3; i++) {
      const { value } = await reader.read()
      expect(value).toEqual(new Uint8Array([i]))
    }
  })

  it('Check stream Response if aborted by client', async () => {
    let aborted = false
    const res = stream(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      for (let i = 0; i < 3; i++) {
        await stream.write(new Uint8Array([i]))
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const { value } = await reader.read()
    expect(value).toEqual(new Uint8Array([0]))
    reader.cancel()
    expect(aborted).toBeTruthy()
  })

  it('Check stream Response if error occurred', async () => {
    const onError = vi.fn()
    const res = stream(
      c,
      async () => {
        throw new Error('error')
      },
      onError
    )
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const { value } = await reader.read()
    expect(value).toBeUndefined()
    expect(onError).toBeCalledTimes(1)
    expect(onError).toBeCalledWith(new Error('error'), expect.anything()) // 2nd argument is StreamingApi instance
  })

  it('Check compressed stream Response', async () => {
    const options: CompressionOptions = { compress: true, format: 'gzip' }
    const res = stream(
      c,
      async (stream) => {
        for (let i = 0; i < 3; i++) {
          await stream.write(new Uint8Array([i]))
          await stream.sleep(1)
        }
      },
      undefined,
      options
    )
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
    expect(compressedData.length).toBeGreaterThan(3) // Compressed data is typically larger than the raw data for small inputs
  })

  it('Check decompressed stream Response', async () => {
    const options: CompressionOptions = { decompress: true, format: 'gzip' }
    const res = stream(
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
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decompressedData = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      decompressedData.push(...value)
    }
    const textDecoder = new TextDecoder()
    const result = textDecoder.decode(new Uint8Array(decompressedData))
    expect(result).toEqual('Hello, world!')
  })

  it('Check invalid compression and decompression options', () => {
    const options: CompressionOptions = { compress: true, decompress: true, format: 'gzip' }
    expect(() =>
      stream(
        c,
        async (stream) => {
          for (let i = 0; i < 3; i++) {
            await stream.write(new Uint8Array([i]))
            await stream.sleep(1)
          }
        },
        undefined,
        options
      )
    ).toThrow('Compression and decompression cannot be enabled simultaneously.')
  })
})
