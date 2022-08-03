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
  app.get('/etag/ghi', (c) => {
    return c.json({ message: 'Hono is ultra cool' })
  })

  app.use('/etag-weak/*', etag({ weak: true }))
  app.get('/etag-weak/abc', (c) => {
    return c.text('Hono is cool')
  })

  it('Should return etag header', async () => {
    let res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4e32298b1cb4edc595237405e5b696e105c2399a"')

    res = await app.request('http://localhost/etag/def')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4515561204e8269cb4468d5b39288d8f2482dcfe"')
  })

  it('Should not be the same values', async () => {
    let res = await app.request('http://localhost/etag/def')
    const hash = res.headers.get('Etag')
    res = await app.request('http://localhost/etag/ghi')
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
    const etag = res.headers.get('Etag') || ''

    const req = new Request('http://localhost/etag/abc', {
      headers: {
        'If-None-Match': etag,
      },
    })
    res = await app.request(req)
    expect(res.status).toBe(304)
    expect(await res.text()).toBe('')
  })
})
