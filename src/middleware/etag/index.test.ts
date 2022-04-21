import { Hono } from '@/hono'
import { etag } from '@/middleware/etag'

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

  it('Should return etag header', async () => {
    let res = await app.request('http://localhost/etag/abc')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4e32298b1cb4edc595237405e5b696e105c2399a"')

    res = await app.request('http://localhost/etag/def')
    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"c1d44ff03aff1372856c281854f454e2e1d15b7c"')
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
    const etag = res.headers.get('Etag')

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
