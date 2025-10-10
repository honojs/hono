import { stream, streamSSE } from '../../helper/streaming'
import { Hono } from '../../hono'
import { compress } from '.'

describe('Compress Middleware', () => {
  const app = new Hono()

  // Apply compress middleware to all routes
  app.use('*', compress())

  // Test routes
  app.get('/small', (c) => {
    c.header('Content-Type', 'text/plain')
    c.header('Content-Length', '5')
    return c.text('small')
  })
  app.get('/large', (c) => {
    c.header('Content-Type', 'text/plain')
    c.header('Content-Length', '1024')
    return c.text('a'.repeat(1024))
  })
  app.get('/small-json', (c) => {
    c.header('Content-Type', 'application/json')
    c.header('Content-Length', '26')
    return c.json({ message: 'Hello, World!' })
  })
  app.get('/large-json', (c) => {
    c.header('Content-Type', 'application/json')
    c.header('Content-Length', '1024')
    return c.json({ data: 'a'.repeat(1024), message: 'Large JSON' })
  })
  app.get('/no-transform', (c) => {
    c.header('Content-Type', 'text/plain')
    c.header('Content-Length', '1024')
    c.header('Cache-Control', 'no-transform')
    return c.text('a'.repeat(1024))
  })
  app.get('/jpeg-image', (c) => {
    c.header('Content-Type', 'image/jpeg')
    c.header('Content-Length', '1024')
    return c.body(new Uint8Array(1024)) // Simulated JPEG data
  })
  app.get('/already-compressed', (c) => {
    c.header('Content-Type', 'application/octet-stream')
    c.header('Content-Encoding', 'br')
    c.header('Content-Length', '1024')
    return c.body(new Uint8Array(1024)) // Simulated compressed data
  })
  app.get('/transfer-encoding-deflate', (c) => {
    c.header('Content-Type', 'application/octet-stream')
    c.header('Transfer-Encoding', 'deflate')
    c.header('Content-Length', '1024')
    return c.body(new Uint8Array(1024)) // Simulated deflate data
  })
  app.get('/chunked', (c) => {
    c.header('Content-Type', 'application/octet-stream')
    c.header('Transfer-Encoding', 'chunked')
    c.header('Content-Length', '1024')
    return c.body(new Uint8Array(1024)) // Simulated chunked data
  })
  app.get('/stream', (c) =>
    stream(c, async (stream) => {
      c.header('Content-Type', 'text/plain')
      // 60000 bytes
      for (let i = 0; i < 10000; i++) {
        await stream.write('chunk ')
      }
    })
  )
  app.get('/already-compressed-stream', (c) =>
    stream(c, async (stream) => {
      c.header('Content-Type', 'text/plain')
      c.header('Content-Encoding', 'br')
      // 60000 bytes
      for (let i = 0; i < 10000; i++) {
        await stream.write(new Uint8Array([0, 1, 2, 3, 4, 5])) // Simulated compressed data
      }
    })
  )
  app.get('/sse', (c) =>
    streamSSE(c, async (stream) => {
      for (let i = 0; i < 1000; i++) {
        await stream.writeSSE({ data: 'chunk' })
      }
    })
  )
  app.notFound((c) => c.text('Custom NotFound', 404))

  const testCompression = async (
    path: string,
    acceptEncoding: string,
    expectedEncoding: string | null
  ) => {
    const req = new Request(`http://localhost${path}`, {
      method: 'GET',
      headers: new Headers({ 'Accept-Encoding': acceptEncoding }),
    })
    const res = await app.request(req)
    expect(res.headers.get('Content-Encoding')).toBe(expectedEncoding)
    return res
  }

  describe('Compression Behavior', () => {
    it('should compress large responses with gzip', async () => {
      const res = await testCompression('/large', 'gzip', 'gzip')
      expect(res.headers.get('Content-Length')).toBeNull()
      expect((await res.arrayBuffer()).byteLength).toBeLessThan(1024)
    })

    it('should compress large responses with deflate', async () => {
      const res = await testCompression('/large', 'deflate', 'deflate')
      expect((await res.arrayBuffer()).byteLength).toBeLessThan(1024)
    })

    it('should prioritize gzip over deflate when both are accepted', async () => {
      await testCompression('/large', 'gzip, deflate', 'gzip')
    })

    it('should not compress small responses', async () => {
      const res = await testCompression('/small', 'gzip, deflate', null)
      expect(res.headers.get('Content-Length')).toBe('5')
    })

    it('should not compress when no Accept-Encoding is provided', async () => {
      await testCompression('/large', '', null)
    })

    it('should not compress images', async () => {
      const res = await testCompression('/jpeg-image', 'gzip', null)
      expect(res.headers.get('Content-Type')).toBe('image/jpeg')
      expect(res.headers.get('Content-Length')).toBe('1024')
    })

    it('should not compress already compressed responses', async () => {
      const res = await testCompression('/already-compressed', 'gzip', 'br')
      expect(res.headers.get('Content-Length')).toBe('1024')
    })

    it('should remove Content-Length when compressing', async () => {
      const res = await testCompression('/large', 'gzip', 'gzip')
      expect(res.headers.get('Content-Length')).toBeNull()
    })

    it('should not remove Content-Length when not compressing', async () => {
      const res = await testCompression('/jpeg-image', 'gzip', null)
      expect(res.headers.get('Content-Length')).toBeDefined()
    })

    it('should not compress transfer-encoding: deflate', async () => {
      const res = await testCompression('/transfer-encoding-deflate', 'gzip', null)
      expect(res.headers.get('Content-Length')).toBe('1024')
      expect(res.headers.get('Transfer-Encoding')).toBe('deflate')
    })

    it('should not compress transfer-encoding: chunked', async () => {
      const res = await testCompression('/chunked', 'gzip', null)
      expect(res.headers.get('Content-Length')).toBe('1024')
      expect(res.headers.get('Transfer-Encoding')).toBe('chunked')
    })
  })

  describe('JSON Handling', () => {
    it('should not compress small JSON responses', async () => {
      const res = await testCompression('/small-json', 'gzip', null)
      expect(res.headers.get('Content-Length')).toBe('26')
    })

    it('should compress large JSON responses', async () => {
      const res = await testCompression('/large-json', 'gzip', 'gzip')
      expect(res.headers.get('Content-Length')).toBeNull()
      const decompressed = await decompressResponse(res)
      const json = JSON.parse(decompressed)
      expect(json.data.length).toBe(1024)
      expect(json.message).toBe('Large JSON')
    })
  })

  describe('Streaming Responses', () => {
    it('should compress streaming responses written in multiple chunks', async () => {
      const res = await testCompression('/stream', 'gzip', 'gzip')
      const decompressed = await decompressResponse(res)
      expect(decompressed.length).toBe(60000)
    })

    it('should not compress already compressed streaming responses', async () => {
      const res = await testCompression('/already-compressed-stream', 'gzip', 'br')
      expect((await res.arrayBuffer()).byteLength).toBe(60000)
    })

    it('should not compress server-sent events', async () => {
      const res = await testCompression('/sse', 'gzip', null)
      expect((await res.arrayBuffer()).byteLength).toBe(13000)
    })
  })

  describe('Edge Cases', () => {
    it('should not compress responses with Cache-Control: no-transform', async () => {
      await testCompression('/no-transform', 'gzip', null)
    })

    it('should handle HEAD requests without compression', async () => {
      const req = new Request('http://localhost/large', {
        method: 'HEAD',
        headers: new Headers({ 'Accept-Encoding': 'gzip' }),
      })
      const res = await app.request(req)
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })

    it('should compress custom 404 Not Found responses', async () => {
      const res = await testCompression('/not-found', 'gzip', 'gzip')
      expect(res.status).toBe(404)
      const decompressed = await decompressResponse(res)
      expect(decompressed).toBe('Custom NotFound')
    })
  })
})

async function decompressResponse(res: Response): Promise<string> {
  const decompressedStream = res.body!.pipeThrough(new DecompressionStream('gzip'))
  const decompressedResponse = new Response(decompressedStream)
  return await decompressedResponse.text()
}
