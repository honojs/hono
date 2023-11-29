import { Hono } from '../../hono.ts'
import { compress } from './index.ts'

describe('Parse Compress Middleware', () => {
  const app = new Hono()

  app.use('*', compress())
  app.get('/hello', async (ctx) => {
    ctx.header('Content-Length', '5')
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
    expect(res.headers.get('Content-Length')).toBeNull()
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
    expect(res.headers.get('Content-Length')).toBeNull()
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
    expect(res.headers.get('Content-Length')).toBeNull()
  })

  it('raw', async () => {
    const req = new Request('http://localhost/hello', {
      method: 'GET',
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBeNull()
    expect(res.headers.get('Content-Length')).toBe('5')
  })
})
