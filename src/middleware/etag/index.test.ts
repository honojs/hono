import { Hono } from '../../hono'
import { RETAINED_304_HEADERS, etag } from '.'

describe('Etag Middleware', () => {
  it('Should return etag header', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/abc', (c) => {
      return c.text('Hono is hot')
    })
    app.get('/etag/def', (c) => {
      return c.json({ message: 'Hono is hot' })
    })
    let res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"d104fafdb380655dab607c9bddc4d4982037afa1"')

    res = await app.request('http://localhost/etag/def')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"67340414f1a52c4669a6cec71f0ae04532b29249"')
  })

  it('Should return etag header with another algorithm', async () => {
    const app = new Hono()
    app.use(
      '/etag/*',
      etag({
        generateDigest: (body) =>
          crypto.subtle.digest(
            {
              name: 'SHA-256',
            },
            body
          ),
      })
    )
    app.get('/etag/abc', (c) => {
      return c.text('Hono is hot')
    })
    app.get('/etag/def', (c) => {
      return c.json({ message: 'Hono is hot' })
    })
    let res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe(
      '"ed00834279b4fd5dcdc7ab6a5c9774de8afb2de30da2c8e0f17d0952839b5370"'
    )

    res = await app.request('http://localhost/etag/def')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe(
      '"83b61a767db6e22afea68dd645b4d4597a06276c8ce7f895ad865cf4ab154ec4"'
    )
  })

  it('Should return etag header - binary', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag', async (c) => {
      return c.body(new Uint8Array(1))
    })

    const res = await app.request('http://localhost/etag')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    const etagHeader = res.headers.get('ETag')
    expect(etagHeader).toBe('"5ba93c9db0cff93f52b521d7420e43f6eda2784f"')
  })

  it('Should not be the same etag - arrayBuffer', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/ab1', (c) => {
      return c.body(new ArrayBuffer(1))
    })
    app.get('/etag/ab2', (c) => {
      return c.body(new ArrayBuffer(2))
    })

    let res = await app.request('http://localhost/etag/ab1')
    const hash = res.headers.get('Etag')
    res = await app.request('http://localhost/etag/ab2')
    expect(res.headers.get('ETag')).not.toBe(hash)
  })

  it('Should not be the same etag - Uint8Array', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/ui1', (c) => {
      return c.body(new Uint8Array([1, 2, 3]))
    })
    app.get('/etag/ui2', (c) => {
      return c.body(new Uint8Array([1, 2, 3, 4]))
    })

    let res = await app.request('http://localhost/etag/ui1')
    const hash = res.headers.get('Etag')
    res = await app.request('http://localhost/etag/ui2')
    expect(res.headers.get('ETag')).not.toBe(hash)
  })

  it('Should not be the same etag - ReadableStream', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/rs1', (c) => {
      return c.body(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1]))
            controller.enqueue(new Uint8Array([2]))
            controller.close()
          },
        })
      )
    })
    app.get('/etag/rs2', (c) => {
      return c.body(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1]))
            controller.enqueue(new Uint8Array([3]))
            controller.close()
          },
        })
      )
    })

    let res = await app.request('http://localhost/etag/rs1')
    const hash = res.headers.get('Etag')
    res = await app.request('http://localhost/etag/rs2')
    expect(res.headers.get('ETag')).not.toBe(hash)
  })

  it('Should not return etag header when the stream is empty', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/abc', (c) => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close()
        },
      })
      return c.body(stream)
    })
    const res = await app.request('http://localhost/etag/abc')
    expect(res.status).toBe(200)
    expect(res.headers.get('ETag')).toBeNull()
  })

  it('Should not return etag header when body is null', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/abc', () => new Response(null, { status: 500 }))
    const res = await app.request('http://localhost/etag/abc')
    expect(res.status).toBe(500)
    expect(res.headers.get('ETag')).toBeNull()
  })

  it('Should return etag header - weak', async () => {
    const app = new Hono()
    app.use('/etag/*', etag({ weak: true }))
    app.get('/etag/abc', (c) => {
      return c.text('Hono is hot')
    })

    const res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('W/"d104fafdb380655dab607c9bddc4d4982037afa1"')
  })

  it('Should handle conditional GETs', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/ghi', (c) =>
      c.text('Hono is great', 200, {
        'cache-control': 'public, max-age=120',
        date: 'Mon, Feb 27 2023 12:08:36 GMT',
        expires: 'Mon, Feb 27 2023 12:10:36 GMT',
        server: 'Upstream 1.2',
        vary: 'Accept-Language',
      })
    )

    // unconditional GET
    let res = await app.request('http://localhost/etag/ghi')
    expect(res.status).toBe(200)
    expect(res.headers.get('ETag')).not.toBeFalsy()
    const etagHeaderValue = res.headers.get('ETag') || ''

    // conditional GET with the wrong ETag:
    res = await app.request('http://localhost/etag/ghi', {
      headers: {
        'If-None-Match': '"not the right etag"',
      },
    })
    expect(res.status).toBe(200)

    // conditional GET with matching ETag:
    res = await app.request('http://localhost/etag/ghi', {
      headers: {
        'If-None-Match': etagHeaderValue,
      },
    })
    expect(res.status).toBe(304)
    expect(res.headers.get('Etag')).toBe(etagHeaderValue)
    expect(await res.text()).toBe('')
    expect(res.headers.get('cache-control')).toBe('public, max-age=120')
    expect(res.headers.get('date')).toBe('Mon, Feb 27 2023 12:08:36 GMT')
    expect(res.headers.get('expires')).toBe('Mon, Feb 27 2023 12:10:36 GMT')
    expect(res.headers.get('server')).toBeFalsy()
    expect(res.headers.get('vary')).toBe('Accept-Language')

    // conditional GET with matching ETag among list:
    res = await app.request('http://localhost/etag/ghi', {
      headers: {
        'If-None-Match': `"mismatch 1", ${etagHeaderValue}, "mismatch 2"`,
      },
    })
    expect(res.status).toBe(304)
  })

  it('Should not return duplicate etag header values', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.use('/etag/*', etag())
    app.get('/etag/abc', (c) => c.text('Hono is hot'))

    const res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"d104fafdb380655dab607c9bddc4d4982037afa1"')
  })

  it('Should not override ETag headers from upstream', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/predefined', (c) =>
      c.text('This response has an ETag', 200, { ETag: '"f-0194-d"' })
    )

    const res = await app.request('http://localhost/etag/predefined')
    expect(res.headers.get('ETag')).toBe('"f-0194-d"')
  })

  it('Should retain the default and the specified headers', async () => {
    const cacheControl = 'public, max-age=120'
    const message = 'Hello!'
    const app = new Hono()
    app.use(
      '/etag/*',
      etag({
        retainedHeaders: ['x-message-retain', ...RETAINED_304_HEADERS],
      })
    )
    app.get('/etag', (c) => {
      return c.text('Hono is hot', 200, {
        'cache-control': cacheControl,
        'x-message-retain': message,
        'x-message': message,
      })
    })
    const res = await app.request('/etag', {
      headers: {
        'If-None-Match': '"d104fafdb380655dab607c9bddc4d4982037afa1"',
      },
    })
    expect(res.status).toBe(304)
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"d104fafdb380655dab607c9bddc4d4982037afa1"')
    expect(res.headers.get('Cache-Control')).toBe(cacheControl)
    expect(res.headers.get('x-message-retain')).toBe(message)
    expect(res.headers.get('x-message')).toBeFalsy()
  })

  it('Should return 304 when weak ETag in If-None-Match matches the generated ETag', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/abc', (c) => {
      return c.text('Hono is hot')
    })
    let res = await app.request('http://localhost/etag/abc')
    const headerEtag = res.headers.get('ETag')!

    expect(headerEtag).not.toBeFalsy()

    res = await app.request('http://localhost/etag/abc', {
      headers: {
        'If-None-Match': 'W/"d104fafdb380655dab607c9bddc4d4982037afa1"',
      },
    })

    expect(res.status).toBe(304)
  })

  describe('When crypto is not available', () => {
    let _crypto: Crypto | undefined
    beforeAll(() => {
      _crypto = globalThis.crypto
      Object.defineProperty(globalThis, 'crypto', {
        value: {},
      })
    })

    afterAll(() => {
      Object.defineProperty(globalThis, 'crypto', {
        value: _crypto,
      })
    })

    it('Should not generate etag', async () => {
      const app = new Hono()
      app.use('/etag/*', etag())
      app.get('/etag/no-digest', (c) => c.text('Hono is hot'))
      const res = await app.request('/etag/no-digest')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).toBeNull()
    })

    it('Should not generate etag with custom generator when crypto is unavailable', async () => {
      const app = new Hono()
      app.use(
        '/etag/*',
        etag({
          generateDigest: undefined,
        })
      )
      app.get('/etag/no-custom-digest', (c) => c.text('Hono is hot'))
      const res = await app.request('/etag/no-custom-digest')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).toBeNull()
    })
  })

  describe('AWS Lambda environment', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeAll(() => {
      originalEnv = { ...process.env }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('Should handle etag generation in Lambda environment with AWS_LAMBDA_FUNCTION_NAME', async () => {
      process.env.AWS_LAMBDA_FUNCTION_NAME = 'test-function'
      delete process.env.AWS_EXECUTION_ENV
      delete process.env.LAMBDA_TASK_ROOT

      const app = new Hono()
      app.use('/etag/*', etag())
      app.get('/etag/lambda', (c) => {
        return c.text('Hono in Lambda')
      })

      const res = await app.request('http://localhost/etag/lambda')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).not.toBeFalsy()
      expect(await res.text()).toBe('Hono in Lambda')
    })

    it('Should handle etag generation in Lambda environment with AWS_EXECUTION_ENV', async () => {
      delete process.env.AWS_LAMBDA_FUNCTION_NAME
      process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs18.x'
      delete process.env.LAMBDA_TASK_ROOT

      const app = new Hono()
      app.use('/etag/*', etag())
      app.get('/etag/lambda-exec', (c) => {
        return c.text('Lambda execution env')
      })

      const res = await app.request('http://localhost/etag/lambda-exec')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).not.toBeFalsy()
      expect(await res.text()).toBe('Lambda execution env')
    })

    it('Should handle etag generation in Lambda environment with LAMBDA_TASK_ROOT', async () => {
      delete process.env.AWS_LAMBDA_FUNCTION_NAME
      delete process.env.AWS_EXECUTION_ENV
      process.env.LAMBDA_TASK_ROOT = '/var/task'

      const app = new Hono()
      app.use('/etag/*', etag())
      app.get('/etag/lambda-task', (c) => {
        return c.json({ message: 'Lambda task root', data: [1, 2, 3] })
      })

      const res = await app.request('http://localhost/etag/lambda-task')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).not.toBeFalsy()
      const jsonData = await res.json()
      expect(jsonData.message).toBe('Lambda task root')
      expect(jsonData.data).toEqual([1, 2, 3])
    })
  })

  describe('Edge cases and additional coverage', () => {
    it('Should handle ReadableStream with mixed empty and non-empty chunks', async () => {
      const app = new Hono()
      app.use('/etag/*', etag())
      app.get('/etag/mixed-chunks', (c) => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(0)) // Empty chunk
            controller.enqueue(new Uint8Array([0xaa, 0xbb])) // Non-empty chunk
            controller.enqueue(new Uint8Array(0)) // Empty chunk
            controller.enqueue(new Uint8Array([0xcc])) // Non-empty chunk
            controller.close()
          },
        })
        return c.body(stream)
      })

      const res = await app.request('http://localhost/etag/mixed-chunks')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).not.toBeFalsy()
      expect(res.headers.get('ETag')).toMatch(/^"[a-f0-9]+"$/)
    })

    it('Should propagate generateDigest errors', async () => {
      const app = new Hono()
      app.use(
        '/etag/*',
        etag({
          generateDigest: () => {
            throw new Error('Digest generation failed')
          },
        })
      )
      app.get('/etag/error-digest', (c) => c.text('Error test'))

      const res = await app.request('http://localhost/etag/error-digest')
      expect(res.status).toBe(500)
    })
  })

  describe('Digest generation edge cases', () => {
    it('Should handle ArrayBuffer input directly', async () => {
      const app = new Hono()
      app.use(
        '/etag/*',
        etag({
          generateDigest: (body: Uint8Array) => {
            const result = new ArrayBuffer(2)
            const view = new Uint8Array(result)
            view[0] = body[0] || 0xaa
            view[1] = body[1] || 0xbb
            return result
          },
        })
      )
      app.get('/etag/array-buffer', (c) => {
        const buffer = new ArrayBuffer(4)
        const view = new Uint8Array(buffer)
        view[0] = 0x12
        view[1] = 0x34
        view[2] = 0x56
        view[3] = 0x78
        return c.body(buffer)
      })

      const res = await app.request('http://localhost/etag/array-buffer')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).toBe('"1234"')
    })

    it('Should handle generator returning empty ArrayBuffer', async () => {
      const app = new Hono()
      app.use(
        '/etag/*',
        etag({
          generateDigest: () => new ArrayBuffer(0),
        })
      )
      app.get('/etag/empty-result', (c) => c.text('Test'))

      const res = await app.request('http://localhost/etag/empty-result')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).toBeNull()
    })

    it('Should handle async generator with ArrayBuffer input (covers line 13-14)', async () => {
      const app = new Hono()
      app.use(
        '/etag/*',
        etag({
          generateDigest: async (body: Uint8Array) => {
            // This async function will trigger the await on line 13-14 in digest.ts
            return new Promise((resolve) => {
              setTimeout(() => {
                const result = new ArrayBuffer(2)
                const view = new Uint8Array(result)
                view[0] = body[0] || 0xaa
                view[1] = body[1] || 0xbb
                resolve(result)
              }, 0)
            })
          },
        })
      )
      app.get('/etag/async-arraybuffer', (c) => {
        // Use ArrayBuffer to trigger the ArrayBuffer branch in digest.ts
        const buffer = new ArrayBuffer(2)
        const view = new Uint8Array(buffer)
        view[0] = 0x12
        view[1] = 0x34
        return c.body(buffer)
      })

      const res = await app.request('http://localhost/etag/async-arraybuffer')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).toBe('"1234"')
    })

    it('Should handle async generator returning empty ArrayBuffer with ArrayBuffer input', async () => {
      const app = new Hono()
      app.use(
        '/etag/*',
        etag({
          generateDigest: async () => {
            // Async generator that returns empty ArrayBuffer - covers line 50-51
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(new ArrayBuffer(0))
              }, 0)
            })
          },
        })
      )
      app.get('/etag/async-empty-arraybuffer', (c) => {
        const buffer = new ArrayBuffer(1)
        const view = new Uint8Array(buffer)
        view[0] = 0xaa
        return c.body(buffer)
      })

      const res = await app.request('http://localhost/etag/async-empty-arraybuffer')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).toBeNull()
    })

    it('Should handle hex conversion for all byte values', async () => {
      const app = new Hono()
      app.use(
        '/etag/*',
        etag({
          generateDigest: (body: Uint8Array) => {
            const result = new ArrayBuffer(body.length)
            const view = new Uint8Array(result)
            view.set(body)
            return result
          },
        })
      )
      app.get('/etag/hex-test', (c) => {
        const buffer = new ArrayBuffer(4)
        const view = new Uint8Array(buffer)
        view[0] = 0x00
        view[1] = 0x0f
        view[2] = 0xa0
        view[3] = 0xff
        return c.body(buffer)
      })

      const res = await app.request('http://localhost/etag/hex-test')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).toBe('"000fa0ff"')
    })
  })
})
