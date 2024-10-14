import { Hono } from '../../hono'
import { partialContent } from './index'

const app = new Hono()

app.use(partialContent())

const body = 'Hello World with Partial Content Middleware!'

app.get('/hello.jpg', (c) => {
  return c.body(body, {
    headers: {
      'Content-Length': body.length.toString(),
      'Content-Type': 'image/jpeg', // fake content type
    },
  })
})

describe('Partial Content Middleware', () => {
  it('Should return 206 response with correct contents', async () => {
    const res = await app.request('/hello.jpg', {
      headers: {
        Range: 'bytes=0-4, 6-10',
      },
    })
    expect(res.status).toBe(206)
    expect(res.headers.get('Content-Type')).toMatch(
      /^multipart\/byteranges; boundary=PARTIAL_CONTENT_BOUNDARY$/
    )
    expect(res.headers.get('Content-Range')).toBeNull()
    expect(res.headers.get('Content-Length')).toBe('44')
    expect(await res.text()).toBe(
      [
        '--PARTIAL_CONTENT_BOUNDARY',
        'Content-Type: image/jpeg',
        'Content-Range: bytes 0-4/44',
        '',
        'Hello',
        '--PARTIAL_CONTENT_BOUNDARY',
        'Content-Type: image/jpeg',
        'Content-Range: bytes 6-10/44',
        '',
        'World',
        '--PARTIAL_CONTENT_BOUNDARY--',
        '',
      ].join('\r\n')
    )
  })

  it('Should not return 206 response with invalid Range header', async () => {
    const res = await app.request('/hello.jpg', {
      headers: {
        Range: 'bytes=INVALID',
      },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })
})
