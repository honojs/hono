import { Hono } from '../../hono'
import { etag } from '.'

describe('Etag Middleware', () => {
  const app = new Hono()

  app.use('/etag/*', etag())
  app.get('/etag/abc', (c) => {
    return c.text('Hono is cool')
  })
  app.get('/etag/def', (c) => {
    return c.json({ message: 'Hono is cool' })
  })

  app.use('/etag-weak/*', etag({ weak: true }))
  app.get('/etag-weak/abc', (c) => {
    return c.text('Hono is cool')
  })

  app.use('/etag-binary/*', etag())
  app.get('/etag-binary', async (c) => {
    return c.body(new Uint8Array(1))
  })

  app.get('/etag/ab1', (c) => {
    return c.body(new ArrayBuffer(1))
  })
  app.get('/etag/ab2', (c) => {
    return c.body(new ArrayBuffer(2))
  })

  app.get('/etag/ui1', (c) => {
    return c.body(new Uint8Array([1, 2, 3]))
  })
  app.get('/etag/ui2', (c) => {
    return c.body(new Uint8Array([1, 2, 3, 4]))
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
    const res = await app.request('http://localhost/etag-binary')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    const etag = res.headers.get('ETag')
    expect(etag).toBe('"5ba93c9db0cff93f52b521d7420e43f6eda2784f"')
  })

  it('Should not be the same etag - arrayBuffer', async () => {
    let res = await app.request('http://localhost/etag/ab1')
    const hash = res.headers.get('Etag')
    res = await app.request('http://localhost/etag/ab2')
    expect(res.headers.get('ETag')).not.toBe(hash)
  })

  it('Should not be the same etag - Uint8Array', async () => {
    let res = await app.request('http://localhost/etag/ui1')
    const hash = res.headers.get('Etag')
    res = await app.request('http://localhost/etag/ui2')
    expect(res.headers.get('ETag')).not.toBe(hash)
  })

  it('Should return etag header - weak', async () => {
    const res = await app.request('http://localhost/etag-weak/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('W/"4e32298b1cb4edc595237405e5b696e105c2399a"')
  })

  it('Should return 304 response', async () => {
    let res = await app.request('http://localhost/etag/abc')
    expect(res.status).toBe(200)
    expect(res.headers.get('ETag')).not.toBeFalsy()
    const etag = res.headers.get('ETag') || ''

    const req = new Request('http://localhost/etag/abc', {
      headers: {
        'If-None-Match': etag,
      },
    })
    res = await app.request(req)
    expect(res.status).toBe(304)
    expect(res.headers.get('Etag')).toBe(etag)
    expect(await res.text()).toBe('')
  })
})
