import { stream, streamSSE } from '../../helper/streaming'
import { Hono } from '../../hono'
import { compress } from '.'

// Mimics the header guard of a `fetch()` response, whose headers cannot be mutated.
const makeResponseHeaderImmutable = (res: Response) => {
  Object.defineProperty(res, 'headers', {
    value: new Proxy(res.headers, {
      get(target, prop) {
        if (prop === 'set' || prop === 'append' || prop === 'delete') {
          return () => {
            throw new TypeError('Cannot modify headers: Headers are immutable')
          }
        }
        const value = Reflect.get(target, prop)
        return typeof value === 'function' ? value.bind(target) : value
      },
    }),
    writable: false,
  })
  return res
}

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
  app.get('/partial', (c) => {
    c.header('Content-Type', 'text/plain')
    c.header('Content-Length', '1024')
    c.header('Content-Range', 'bytes 0-1023/2048')
    return c.body('a'.repeat(1024), 206)
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

    it('should not compress 206 Partial Content responses', async () => {
      const res = await testCompression('/partial', 'gzip', null)
      expect(res.status).toBe(206)
      expect(res.headers.get('Content-Length')).toBe('1024')
      expect(res.headers.get('Content-Range')).toBe('bytes 0-1023/2048')
      expect(await res.text()).toBe('a'.repeat(1024))
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

  describe('ETag Handling', () => {
    const app = new Hono()
    app.use('*', compress())
    app.get('/strong-etag', (c) => {
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('ETag', '"strong-etag"')
      return c.text('a'.repeat(1024))
    })
    app.get('/weak-etag', (c) => {
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('ETag', 'W/"weak-etag"')
      return c.text('a'.repeat(1024))
    })
    app.get('/no-etag', (c) => {
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      return c.text('a'.repeat(1024))
    })

    it('should convert strong ETag to weak ETag when compressing', async () => {
      const res = await app.request('/strong-etag', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('ETag')).toBe('W/"strong-etag"')
    })

    it('should keep strong ETag when not compressing', async () => {
      const res = await app.request('/strong-etag')
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('ETag')).toBe('"strong-etag"')
    })

    it('should not modify weak ETag when compressing', async () => {
      const res = await app.request('/weak-etag', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('ETag')).toBe('W/"weak-etag"')
    })

    it('should not add ETag when none exists', async () => {
      const res = await app.request('/no-etag', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('ETag')).toBeNull()
    })
  })

  describe('Vary Header', () => {
    const app = new Hono()
    app.use('*', compress())
    app.get('/no-vary', (c) => {
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      return c.text('a'.repeat(1024))
    })
    app.get('/existing-vary', (c) => {
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('Vary', 'Cookie')
      return c.text('a'.repeat(1024))
    })
    app.get('/already-accept-encoding', (c) => {
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('Vary', 'Accept-Encoding')
      return c.text('a'.repeat(1024))
    })
    app.get('/wildcard-vary', (c) => {
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('Vary', '*')
      return c.text('a'.repeat(1024))
    })
    app.get('/not-compressible', (c) => {
      c.header('Content-Type', 'image/png')
      c.header('Content-Length', '1024')
      return c.body('a'.repeat(1024))
    })
    app.get('/immutable-headers', () =>
      makeResponseHeaderImmutable(
        new Response('a'.repeat(1024), {
          headers: { 'Content-Type': 'text/plain', 'Content-Length': '1024' },
        })
      )
    )

    it('should set Vary: Accept-Encoding when compressing', async () => {
      const res = await app.request('/no-vary', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    })

    it('should append Accept-Encoding to an existing Vary header', async () => {
      const res = await app.request('/existing-vary', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('Vary')).toBe('Cookie, Accept-Encoding')
    })

    it('should not duplicate Accept-Encoding when Vary already lists it', async () => {
      const res = await app.request('/already-accept-encoding', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    })

    it('should leave Vary: * unchanged', async () => {
      const res = await app.request('/wildcard-vary', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('Vary')).toBe('*')
    })

    it('should set Vary on an identity response when Accept-Encoding is absent', async () => {
      const res = await app.request('/no-vary')
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    })

    it('should set Vary on an identity response when no offered encoding is accepted', async () => {
      const res = await app.request('/no-vary', {
        headers: { 'Accept-Encoding': 'br' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    })

    it('should not add a Vary header when the response is not eligible for compression', async () => {
      const res = await app.request('/not-compressible', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBeNull()
    })

    it('should set Vary on a response with immutable headers', async () => {
      const res = await app.request('/immutable-headers', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    })
  })

  describe('contentTypeFilter', () => {
    describe('RegExp', () => {
      const app = new Hono()
      app.use('*', compress({ contentTypeFilter: /^application\/json/, threshold: 0 }))
      app.get('/json', (c) => c.json({ data: 'a'.repeat(1024) }))
      app.get('/text', (c) => c.text('a'.repeat(1024)))

      it('should compress when Content-Type matches', async () => {
        const res = await app.request('/json', {
          headers: { 'Accept-Encoding': 'gzip' },
        })
        expect(res.headers.get('Content-Encoding')).toBe('gzip')
      })

      it('should not compress when Content-Type does not match', async () => {
        const res = await app.request('/text', {
          headers: { 'Accept-Encoding': 'gzip' },
        })
        expect(res.headers.get('Content-Encoding')).toBeNull()
      })
    })

    describe('function', () => {
      const app = new Hono()
      app.use('*', compress({ contentTypeFilter: (type) => type.includes('json'), threshold: 0 }))
      app.get('/json', (c) => c.json({ data: 'a'.repeat(1024) }))
      app.get('/text', (c) => c.text('a'.repeat(1024)))

      it('should compress when Content-Type matches', async () => {
        const res = await app.request('/json', {
          headers: { 'Accept-Encoding': 'gzip' },
        })
        expect(res.headers.get('Content-Encoding')).toBe('gzip')
      })

      it('should not compress when Content-Type does not match', async () => {
        const res = await app.request('/text', {
          headers: { 'Accept-Encoding': 'gzip' },
        })
        expect(res.headers.get('Content-Encoding')).toBeNull()
      })
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

  describe('Encoding Option', () => {
    const buildApp = (encoding: 'gzip' | 'deflate') => {
      const app = new Hono()
      app.use('*', compress({ encoding }))
      app.get('/large', (c) => {
        c.header('Content-Type', 'text/plain')
        c.header('Content-Length', '1024')
        return c.text('a'.repeat(1024))
      })
      return app
    }

    it('should compress when configured encoding is accepted by the client', async () => {
      const app = buildApp('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
    })

    it('should not compress when configured encoding is not in Accept-Encoding', async () => {
      const app = buildApp('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'deflate' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })

    it('should not compress when Accept-Encoding header is absent', async () => {
      const app = buildApp('gzip')
      const res = await app.request('/large')
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })
  })

  describe('Accept-Encoding parsing', () => {
    const buildAppDefault = () => {
      const app = new Hono()
      app.use('*', compress())
      app.get('/large', (c) => {
        c.header('Content-Type', 'text/plain')
        c.header('Content-Length', '1024')
        return c.text('a'.repeat(1024))
      })
      return app
    }

    const buildAppWithEncoding = (encoding: 'gzip' | 'deflate') => {
      const app = new Hono()
      app.use('*', compress({ encoding }))
      app.get('/large', (c) => {
        c.header('Content-Type', 'text/plain')
        c.header('Content-Length', '1024')
        return c.text('a'.repeat(1024))
      })
      return app
    }

    it('should not compress when configured encoding has q=0', async () => {
      const app = buildAppWithEncoding('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip;q=0' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })

    it('should fall back to another encoding when the preferred one has q=0', async () => {
      const app = buildAppDefault()
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip;q=0, deflate' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('deflate')
    })

    it('should compress when Accept-Encoding is the wildcard *', async () => {
      const app = buildAppWithEncoding('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': '*' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
    })

    it('should compress when Accept-Encoding token differs only in case', async () => {
      const app = buildAppWithEncoding('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'GZIP' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
    })

    it('should not treat x-gzip as gzip', async () => {
      const app = buildAppWithEncoding('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'x-gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })

    it('should pick the encoding with the highest q value', async () => {
      const app = buildAppDefault()
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip;q=0.5, deflate;q=0.9' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('deflate')
    })

    it('should prefer gzip over deflate when q values are equal', async () => {
      const app = buildAppDefault()
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip;q=0.5, deflate;q=0.5' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
    })
  })
})

async function decompressResponse(res: Response): Promise<string> {
  const decompressedStream = res.body!.pipeThrough(new DecompressionStream('gzip'))
  const decompressedResponse = new Response(decompressedStream)
  return await decompressedResponse.text()
}
