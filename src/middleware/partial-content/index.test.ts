import { Hono } from '../../hono'
import { partialContent } from './index'

const app = new Hono()

app.use(partialContent())

const body = 'This is a test mock data for range requests.'

app.get('/hello.jpg', (c) => {
  return c.body(body, {
    headers: {
      'Content-Length': body.length.toString(),
      'Content-Type': 'image/jpeg', // fake content type
    },
  })
})

describe('Partial Content Middleware', () => {
  it('Should return the first 5 bytes of the mock data (bytes=0-4)', async () => {
    const res = await app.request('/hello.jpg', {
      headers: {
        Range: 'bytes=0-4',
      },
    })

    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(res.headers.get('Content-Range')).toBe('bytes 0-4/44')
    expect(await res.text()).toBe('This ')
  })

  it('Should return the bytes from 6 to 10 (bytes=6-10)', async () => {
    const res = await app.request('/hello.jpg', {
      headers: {
        Range: 'bytes=6-10',
      },
    })

    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(res.headers.get('Content-Range')).toBe('bytes 6-10/44')
    expect(await res.text()).toBe('s a t')
  })

  it('Should return multiple ranges of the mock data (bytes=0-4, 6-10)', async () => {
    const res = await app.request('/hello.jpg', {
      headers: {
        Range: 'bytes=0-4, 6-10',
      },
    })

    expect(res.headers.get('Content-Type')).toBe(
      'multipart/byteranges; boundary=PARTIAL_CONTENT_BOUNDARY'
    )

    const expectedResponse = [
      '--PARTIAL_CONTENT_BOUNDARY',
      'Content-Type: image/jpeg',
      'Content-Range: bytes 0-4/44',
      '',
      'This ',
      '--PARTIAL_CONTENT_BOUNDARY',
      'Content-Type: image/jpeg',
      'Content-Range: bytes 6-10/44',
      '',
      's a t',
      '--PARTIAL_CONTENT_BOUNDARY--',
      '',
    ].join('\r\n')
    expect(await res.text()).toBe(expectedResponse)
  })

  it('Should return the last 10 bytes of the mock data (bytes=-10)', async () => {
    const res = await app.request('/hello.jpg', {
      headers: {
        Range: 'bytes=-10',
      },
    })

    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(res.headers.get('Content-Range')).toBe('bytes 34-43/44')
    expect(await res.text()).toBe(' requests.')
  })

  it('Should return the remaining bytes starting from byte 10 (bytes=10-)', async () => {
    const res = await app.request('/hello.jpg', {
      headers: {
        Range: 'bytes=10-',
      },
    })

    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(res.headers.get('Content-Range')).toBe('bytes 10-43/44')
    expect(await res.text()).toBe('test mock data for range requests.')
  })

  it('Should return 416 Range Not Satisfiable for excessive number of ranges (11 or more)', async () => {
    const res = await app.request('/hello.jpg', {
      headers: {
        Range: 'bytes=0-0,1-1,2-2,3-3,4-4,5-5,6-6,7-7,8-8,9-9,10-10',
      },
    })

    expect(res.status).toBe(416)
    expect(res.headers.get('Content-Range')).toBeNull()
    expect(res.headers.get('Content-Length')).toBe('44')
  })

  it('Should return 404 if content is not found', async () => {
    const app = new Hono()
    app.use(partialContent())

    app.get('/notfound.jpg', (c) => {
      return c.notFound()
    })

    const res = await app.request('/notfound.jpg', {
      headers: {
        Range: 'bytes=0-10',
      },
    })

    expect(res.status).toBe(404)
  })

  it('Should return full content if Range header is not provided', async () => {
    const res = await app.request('/hello.jpg')

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(await res.text()).toBe(body) // Full body should be returned
  })

  it('Should return full content if Content-Length is missing', async () => {
    const appWithoutContentLength = new Hono()
    appWithoutContentLength.use(partialContent())

    appWithoutContentLength.get('/hello.jpg', (c) => {
      return c.body(body, {
        headers: {
          'Content-Type': 'image/jpeg',
        },
      })
    })

    const res = await appWithoutContentLength.request('/hello.jpg', {
      headers: {
        Range: 'bytes=0-4',
      },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(await res.text()).toBe(body)
  })

  it('Should return 204 No Content if body is missing', async () => {
    const appWithoutBody = new Hono()
    appWithoutBody.use(partialContent())

    appWithoutBody.get('/empty.jpg', (c) => {
      return c.body(null, 204)
    })

    const res = await appWithoutBody.request('/empty.jpg', {
      headers: {
        Range: 'bytes=0-4',
      },
    })

    expect(res.status).toBe(204)
    expect(res.headers.get('Content-Type')).toBeNull()
    expect(await res.text()).toBe('')
  })
})
