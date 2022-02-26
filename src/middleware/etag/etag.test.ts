import { Hono } from '../../hono'
import { etag } from './etag'

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

  it('should return etag header', async () => {
    let req = new Request('http://localhost/etag/abc')
    let res = await app.dispatch(req)

    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"4e32298b1cb4edc595237405e5b696e105c2399a"')

    req = new Request('http://localhost/etag/def')
    res = await app.dispatch(req)

    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('"c1d44ff03aff1372856c281854f454e2e1d15b7c"')
  })

  it('should return etag header - weak', async () => {
    const req = new Request('http://localhost/etag-weak/abc')
    const res = await app.dispatch(req)

    expect(res.headers.get('ETag')).not.toBeFalsy()
    expect(res.headers.get('ETag')).toBe('W/"4e32298b1cb4edc595237405e5b696e105c2399a"')
  })

  it('should return 304 response', async () => {
    let req = new Request('http://localhost/etag/abc')
    let res = await app.dispatch(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('ETag')).not.toBeFalsy()
    const etag = res.headers.get('Etag')

    req = new Request('http://localhost/etag/abc', {
      headers: {
        'If-None-Match': etag,
      },
    })
    res = await app.dispatch(req)

    expect(res.status).toBe(304)
    expect(await res.text()).toBe('')
  })
})
