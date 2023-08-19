import { Hono } from '../../hono'
import { compress } from '.'

describe('Parse Compress Middleware', () => {
  const app = new Hono()

  app.use('*', compress())
  app.get('/hello', async (ctx) => {
    return ctx.text('hello')
  })

  it('gzip', async () => {
    const req = new Request('http://localhost/hello', {
      method: 'GET',
      headers: new Headers({ 'Accept-Encoding': 'gzip' }),
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toEqual('gzip')
  })

  it('deflate', async () => {
    const req = new Request('http://localhost/hello', {
      method: 'GET',
      headers: new Headers({ 'Accept-Encoding': 'deflate' }),
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toEqual('deflate')
  })

  it('gzip or deflate', async () => {
    const req = new Request('http://localhost/hello', {
      method: 'GET',
      headers: new Headers({ 'Accept-Encoding': 'gzip, deflate' }),
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toEqual('gzip')
  })

  it('raw', async () => {
    const req = new Request('http://localhost/hello', {
      method: 'GET',
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBeNull()
  })
})
