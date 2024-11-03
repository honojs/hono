import { Hono } from '../../hono'
import { RETAINED_304_HEADERS, etag } from '.'

describe('Etag Middleware', () => {
  it('Should return etag header', async () => {
    const app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/abc', (c) => {
      return c.text('Hono is cool')
    })
    app.get('/etag/def', (c) => {
      return c.json({ message: 'Hono is cool' })
    })
    let res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4e32298b1cb4edc595237405e5b696e105c2399a"')

    res = await app.request('http://localhost/etag/def')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4515561204e8269cb4468d5b39288d8f2482dcfe"')
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
      return c.text('Hono is cool')
    })

    const res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('W/"4e32298b1cb4edc595237405e5b696e105c2399a"')
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
    app.get('/etag/abc', (c) => c.text('Hono is cool'))

    const res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4e32298b1cb4edc595237405e5b696e105c2399a"')
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
      return c.text('Hono is cool', 200, {
        'cache-control': cacheControl,
        'x-message-retain': message,
        'x-message': message,
      })
    })
    const res = await app.request('/etag', {
      headers: {
        'If-None-Match': '"4e32298b1cb4edc595237405e5b696e105c2399a"',
      },
    })
    expect(res.status).toBe(304)
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4e32298b1cb4edc595237405e5b696e105c2399a"')
    expect(res.headers.get('Cache-Control')).toBe(cacheControl)
    expect(res.headers.get('x-message-retain')).toBe(message)
    expect(res.headers.get('x-message')).toBeFalsy()
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
      app.get('/etag/no-digest', (c) => c.text('Hono is cool'))
      const res = await app.request('/etag/no-digest')
      expect(res.status).toBe(200)
      expect(res.headers.get('ETag')).toBeNull()
    })
  })
})
