import { Hono } from '../../hono'
import { etag } from '.'

describe('Etag Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.use('/etag/*', etag())
    app.get('/etag/abc', (c) => {
      return c.text('Hono is cool')
    })
    app.get('/etag/def', (c) => {
      return c.json({ message: 'Hono is cool' })
    })
  })

  it('Should return etag header', async () => {
    let res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4e32298b1cb4edc595237405e5b696e105c2399a"')

    res = await app.request('http://localhost/etag/def')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4515561204e8269cb4468d5b39288d8f2482dcfe"')
  })

  it('Should return etag header - binary', async () => {
    app.use('/etag-binary/*', etag())
    app.get('/etag-binary', async (c) => {
      return c.body(new Uint8Array(1))
    })

    const res = await app.request('http://localhost/etag-binary')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    const etagHeader = res.headers.get('ETag')
    expect(etagHeader).toBe('"5ba93c9db0cff93f52b521d7420e43f6eda2784f"')
  })

  it('Should not be the same etag - arrayBuffer', async () => {
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

  it('Should return etag header - weak', async () => {
    app.use('/etag-weak/*', etag({ weak: true }))
    app.get('/etag-weak/abc', (c) => {
      return c.text('Hono is cool')
    })

    const res = await app.request('http://localhost/etag-weak/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('W/"4e32298b1cb4edc595237405e5b696e105c2399a"')
  })

  it('Should handle conditional GETs', async () => {
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
    const etag = res.headers.get('ETag') || ''

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
        'If-None-Match': etag,
      },
    })
    expect(res.status).toBe(304)
    expect(res.headers.get('Etag')).toBe(etag)
    expect(await res.text()).toBe('')
    expect(res.headers.get('cache-control')).toBe('public, max-age=120')
    expect(res.headers.get('date')).toBe('Mon, Feb 27 2023 12:08:36 GMT')
    expect(res.headers.get('expires')).toBe('Mon, Feb 27 2023 12:10:36 GMT')
    expect(res.headers.get('server')).toBeFalsy()
    expect(res.headers.get('vary')).toBe('Accept-Language')

    // conditional GET with matching ETag among list:
    res = await app.request('http://localhost/etag/ghi', {
      headers: {
        'If-None-Match': `"mismatch 1", ${etag}, "mismatch 2"`,
      },
    })
    expect(res.status).toBe(304)
  })

  it('Should not return duplicate etag header values', async () => {
    app.use('/etag2/*', etag())
    app.use('/etag2/*', etag())
    app.get('/etag2/abc', (c) => c.text('Hono is cool'))

    const res = await app.request('http://localhost/etag2/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4e32298b1cb4edc595237405e5b696e105c2399a"')
  })

  it('Should not override ETag headers from upstream', async () => {
    app.get('/etag/predefined', (c) =>
      c.text('This response has an ETag', 200, { ETag: '"f-0194-d"' })
    )

    const res = await app.request('http://localhost/etag/predefined')
    expect(res.headers.get('ETag')).toBe('"f-0194-d"')
  })
})
