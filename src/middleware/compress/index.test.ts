import { Hono } from '../../hono'
import { compress } from '.'

describe('Parse Compress Middleware', () => {
  const app = new Hono()

  app.use('*', compress())
  app.get('/hello', async (ctx) => {
    ctx.header('Content-Length', '5')
    return ctx.text('hello')
  })
  app.notFound((c) => {
    return c.text('Custom NotFound', 404)
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

  it('Should handle Custom 404 Not Found', async () => {
    const req = new Request('http://localhost/not-found', {
      method: 'GET',
      headers: new Headers({ 'Accept-Encoding': 'gzip' }),
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Encoding')).toEqual('gzip')

    // decompress response body
    const decompressionStream = new DecompressionStream('gzip')
    const decompressedStream = res.body!.pipeThrough(decompressionStream)

    const textDecoder = new TextDecoder()
    const reader = decompressedStream.getReader()
    let text = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      text += textDecoder.decode(value, { stream: true })
    }

    text += textDecoder.decode()
    expect(text).toBe('Custom NotFound')
  })
})
