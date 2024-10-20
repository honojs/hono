import { Hono } from '../../hono'
import { serveStatic as baseServeStatic } from '.'

describe('Serve Static Middleware', () => {
  const app = new Hono()
  const getContent = vi.fn(async (path) => {
    if (path.endsWith('not-found.txt')) {
      return null
    }
    return `Hello in ${path}`
  })

  const serveStatic = baseServeStatic({
    getContent,
    pathResolve: (path) => {
      return `./${path}`
    },
    isDir: (path) => {
      return path === 'static/hello.world'
    },
    onFound: (path, c) => {
      if (path.endsWith('hello.html')) {
        c.header('X-Custom', `Found the file at ${path}`)
      }
    },
  })

  app.get('/static/*', serveStatic)

  beforeEach(() => {
    getContent.mockClear()
  })

  it('Should return 200 response - /static/hello.html', async () => {
    const res = await app.request('/static/hello.html')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBeNull()
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in ./static/hello.html')
    expect(res.headers.get('X-Custom')).toBe('Found the file at ./static/hello.html')
  })

  it('Should return 200 response - /static/sub', async () => {
    const res = await app.request('/static/sub')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in ./static/sub/index.html')
  })

  it('Should return 200 response - /static/helloworld', async () => {
    const res = await app.request('/static/helloworld')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in ./static/helloworld/index.html')
  })

  it('Should return 200 response - /static/hello.world', async () => {
    const res = await app.request('/static/hello.world')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in ./static/hello.world/index.html')
  })

  it('Should decode URI strings - /static/%E7%82%8E.txt', async () => {
    const res = await app.request('/static/%E7%82%8E.txt')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('Hello in ./static/炎.txt')
  })

  it('Should return 404 response - /static/not-found.txt', async () => {
    const res = await app.request('/static/not-found.txt')
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Encoding')).toBeNull()
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('404 Not Found')
    expect(getContent).toBeCalledTimes(1)
  })

  it('Should not allow a directory traversal - /static/%2e%2e/static/hello.html', async () => {
    const res = await app.fetch({
      method: 'GET',
      url: 'http://localhost/static/%2e%2e/static/hello.html',
    } as Request)
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('404 Not Found')
  })

  it('Should return a pre-compressed zstd response - /static/hello.html', async () => {
    const app = new Hono().use(
      '*',
      baseServeStatic({
        getContent,
        precompressed: true,
      })
    )

    const res = await app.request('/static/hello.html', {
      headers: { 'Accept-Encoding': 'zstd' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBe('zstd')
    expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in static/hello.html.zst')
  })

  it('Should return a pre-compressed brotli response - /static/hello.html', async () => {
    const app = new Hono().use(
      '*',
      baseServeStatic({
        getContent,
        precompressed: true,
      })
    )

    const res = await app.request('/static/hello.html', {
      headers: { 'Accept-Encoding': 'wompwomp, gzip, br, deflate, zstd' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBe('br')
    expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in static/hello.html.br')
  })

  it('Should return a pre-compressed brotli response - /static/hello.unknown', async () => {
    const app = new Hono().use(
      '*',
      baseServeStatic({
        getContent,
        precompressed: true,
      })
    )

    const res = await app.request('/static/hello.unknown', {
      headers: { 'Accept-Encoding': 'wompwomp, gzip, br, deflate, zstd' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBe('br')
    expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream')
    expect(await res.text()).toBe('Hello in static/hello.unknown.br')
  })

  it('Should not return a pre-compressed response - /static/not-found.txt', async () => {
    const app = new Hono().use(
      '*',
      baseServeStatic({
        getContent,
        precompressed: true,
      })
    )

    const res = await app.request('/static/not-found.txt', {
      headers: { 'Accept-Encoding': 'gzip, zstd, br' },
    })

    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Encoding')).toBeNull()
    expect(res.headers.get('Vary')).toBeNull()
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('404 Not Found')
  })

  it('Should not return a pre-compressed response - /static/hello.html', async () => {
    const app = new Hono().use(
      '*',
      baseServeStatic({
        getContent,
        precompressed: true,
      })
    )

    const res = await app.request('/static/hello.html', {
      headers: { 'Accept-Encoding': 'wompwomp, unknown' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBeNull()
    expect(res.headers.get('Vary')).toBeNull()
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in static/hello.html')
  })

  it('Should not find pre-compressed files - /static/hello.jpg', async () => {
    const app = new Hono().use(
      '*',
      baseServeStatic({
        getContent,
        precompressed: true,
      })
    )

    const res = await app.request('/static/hello.jpg', {
      headers: { 'Accept-Encoding': 'gzip, br, deflate, zstd' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBeNull()
    expect(res.headers.get('Vary')).toBeNull()
    expect(res.headers.get('Content-Type')).toMatch(/^image\/jpeg/)
    expect(await res.text()).toBe('Hello in static/hello.jpg')
  })

  it('Should return response object content as-is', async () => {
    const body = new ReadableStream()
    const response = new Response(body)
    const app = new Hono().use(
      '*',
      baseServeStatic({
        getContent: async () => {
          return response
        },
      })
    )

    const res = await app.fetch({
      method: 'GET',
      url: 'http://localhost',
    } as Request)
    expect(res.status).toBe(200)
    expect(res.body).toBe(body)
  })

  describe('Changing root path', () => {
    const pathResolve = (path: string) => {
      return path.startsWith('/') ? path : `./${path}`
    }

    it('Should return the content with absolute root path', async () => {
      const app = new Hono()
      const serveStatic = baseServeStatic({
        getContent,
        pathResolve,
        root: '/home/hono/child',
      })
      app.get('/static/*', serveStatic)

      const res = await app.request('/static/html/hello.html')
      expect(await res.text()).toBe('Hello in /home/hono/child/static/html/hello.html')
    })

    it('Should traverse the directories with absolute root path', async () => {
      const app = new Hono()
      const serveStatic = baseServeStatic({
        getContent,
        pathResolve,
        root: '/home/hono/../parent',
      })
      app.get('/static/*', serveStatic)

      const res = await app.request('/static/html/hello.html')
      expect(await res.text()).toBe('Hello in /home/parent/static/html/hello.html')
    })

    it('Should treat the root path includes .. as relative path', async () => {
      const app = new Hono()
      const serveStatic = baseServeStatic({
        getContent,
        pathResolve,
        root: '../home/hono',
      })
      app.get('/static/*', serveStatic)

      const res = await app.request('/static/html/hello.html')
      expect(await res.text()).toBe('Hello in ./../home/hono/static/html/hello.html')
    })

    it('Should not allow directory traversal with . as relative path', async () => {
      const app = new Hono()
      const serveStatic = baseServeStatic({
        getContent,
        pathResolve,
        root: '.',
      })
      app.get('*', serveStatic)

      const res = await app.request('///etc/passwd')
      expect(res.status).toBe(404)
    })
  })

  describe('206 Partial Content support', async () => {
    const getContent = vi.fn()
    const onFound = vi.fn()
    const onNotFound = vi.fn()
    const close = vi.fn()
    const partialContentSupport = vi.fn(async (path) => {
      return {
        size: 1000,
        getPartialContent: (start: number, end: number) => ({
          start,
          end,
          data: `Hello in ${path}`,
        }),
        close,
      }
    })
    beforeEach(() => {
      getContent.mockClear()
      onFound.mockClear()
      onNotFound.mockClear()
      partialContentSupport.mockClear()
      close.mockClear()
    })

    it('fallbacks to getContent if Range header can not be decoded', async () => {
      const app = new Hono().use(
        '*',
        baseServeStatic({
          getContent,
          partialContentSupport,
          onNotFound,
          onFound,
        })
      )

      const res = await app.request('/static/hello.jpg', {
        headers: {
          Range: 'bytes=INVALID',
        },
      })

      expect(getContent).toBeCalledTimes(1)
      expect(partialContentSupport).not.toBeCalled()
      expect(res.status).toBe(404)
      // Other parts of the response is not interesting here
    })

    // https://www.rfc-editor.org/rfc/rfc9110#name-416-range-not-satisfiable
    it('returns 416 Range Not Satisfiable if excessive number of ranges (11 or more)', async () => {
      const app = new Hono().use(
        '*',
        baseServeStatic({
          getContent,
          partialContentSupport,
          onNotFound,
          onFound,
        })
      )

      const res416 = await app.request('/static/hello.jpg', {
        headers: {
          // 11 ranges is too much
          Range: 'bytes=0-0,1-1,2-2,3-3,4-4,5-5,6-6,7-7,8-8,9-9,10-10',
        },
      })

      expect(getContent).not.toBeCalled()
      expect(partialContentSupport).toBeCalledTimes(1)
      expect(res416.status).toBe(416)
      expect(res416.headers.get('Content-Range')).toBeNull()
      expect(res416.headers.get('Content-Length')).toMatch(/^1000$/)

      const resOK = await app.request('/static/hello.jpg', {
        headers: {
          // 10 ranges is OK
          Range: 'bytes=0-0,1-1,2-2,3-3,4-4,5-5,6-6,7-7,8-8,9-9',
        },
      })

      expect(getContent).not.toBeCalled()
      expect(partialContentSupport).toBeCalledTimes(2)
      expect(resOK.status).toBe(206)
    })

    it('supports bytes=N-M to return a single requested range', async () => {
      const app = new Hono().use(
        '*',
        baseServeStatic({
          getContent,
          partialContentSupport,
          onNotFound,
          onFound,
        })
      )

      const res = await app.request('/static/hello.jpg', {
        headers: {
          Range: 'bytes=31-130',
        },
      })

      expect(getContent).not.toBeCalled()
      expect(partialContentSupport).toBeCalledTimes(1)
      expect(close).toBeCalledTimes(1)
      expect(onFound).toBeCalledTimes(1)
      expect(onNotFound).not.toBeCalled()
      expect(res.status).toBe(206)
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBeNull()
      expect(res.headers.get('Content-Type')).toMatch(/^image\/jpeg$/)
      expect(res.headers.get('Accept-Ranges')).toMatch(/^bytes$/)
      expect(res.headers.get('Content-Range')).toMatch(/^bytes 31-130\/1000$/)
      expect(res.headers.get('Content-Length')).toMatch(/^100$/)
      expect(await res.text()).toBe('Hello in static/hello.jpg')
    })

    it('supports bytes=N- to return the remaining bytes after the first (N-1) bytes', async () => {
      const app = new Hono().use(
        '*',
        baseServeStatic({
          getContent,
          partialContentSupport,
          onNotFound,
          onFound,
        })
      )

      const res = await app.request('/static/hello.jpg', {
        headers: {
          Range: 'bytes=31-',
        },
      })

      expect(getContent).not.toBeCalled()
      expect(partialContentSupport).toBeCalledTimes(1)
      expect(close).toBeCalledTimes(1)
      expect(onFound).toBeCalledTimes(1)
      expect(onNotFound).not.toBeCalled()
      expect(res.status).toBe(206)
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBeNull()
      expect(res.headers.get('Content-Type')).toMatch(/^image\/jpeg$/)
      expect(res.headers.get('Accept-Ranges')).toMatch(/^bytes$/)
      expect(res.headers.get('Content-Range')).toMatch(/^bytes 31-999\/1000$/)
      expect(res.headers.get('Content-Length')).toMatch(/^969$/)
      expect(await res.text()).toBe('Hello in static/hello.jpg')
    })

    it('supports bytes=-N to return the last N bytes', async () => {
      const app = new Hono().use(
        '*',
        baseServeStatic({
          getContent,
          partialContentSupport,
          onNotFound,
          onFound,
        })
      )

      const res = await app.request('/static/hello.jpg', {
        headers: {
          Range: 'bytes=-100',
        },
      })

      expect(getContent).not.toBeCalled()
      expect(partialContentSupport).toBeCalledTimes(1)
      expect(close).toBeCalledTimes(1)
      expect(onFound).toBeCalledTimes(1)
      expect(onNotFound).not.toBeCalled()
      expect(res.status).toBe(206)
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBeNull()
      expect(res.headers.get('Content-Type')).toMatch(/^image\/jpeg$/)
      expect(res.headers.get('Accept-Ranges')).toMatch(/^bytes$/)
      expect(res.headers.get('Content-Range')).toMatch(/^bytes 900-999\/1000$/)
      expect(res.headers.get('Content-Length')).toMatch(/^100$/)
      expect(await res.text()).toBe('Hello in static/hello.jpg')
    })

    it('supports multiple ranges byte=N1-N2,N3-N4,...', async () => {
      const partialContentSupport = vi.fn(async (path: string) => {
        return {
          getPartialContent: (start: number, end: number) => {
            const data =
              start === 101
                ? `Hello in ${path}`
                : start === 301
                ? new Blob([`Hello in ${path}`]).stream()
                : start === 501
                ? new TextEncoder().encode(`Hello in ${path}`)
                : null
            return { start, end, data: data! }
          },
          size: 1000,
          close,
        }
      })
      const app = new Hono().use(
        '*',
        baseServeStatic({
          getContent,
          partialContentSupport,
          onNotFound,
          onFound,
        })
      )

      const res = await app.request('/static/hello.jpg', {
        headers: {
          Range: 'bytes=101-200, 301-400, 501-600',
        },
      })

      expect(getContent).not.toBeCalled()
      expect(partialContentSupport).toBeCalledTimes(1)
      expect(close).toBeCalledTimes(1)
      expect(onFound).toBeCalledTimes(1)
      expect(onNotFound).not.toBeCalled()
      expect(res.status).toBe(206)
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBeNull()
      expect(res.headers.get('Content-Type')).toMatch(
        /^multipart\/byteranges; boundary=PARTIAL_CONTENT_BOUNDARY$/
      )
      expect(res.headers.get('Accept-Ranges')).toMatch(/^bytes$/)
      expect(res.headers.get('Content-Range')).toBeNull()
      expect(res.headers.get('Content-Length')).toMatch(/^300$/)
      expect(await res.text()).toBe(
        [
          '--PARTIAL_CONTENT_BOUNDARY',
          'Content-Type: image/jpeg',
          'Content-Range: bytes 101-200/1000',
          '',
          'Hello in static/hello.jpg',
          '--PARTIAL_CONTENT_BOUNDARY',
          'Content-Type: image/jpeg',
          'Content-Range: bytes 301-400/1000',
          '',
          'Hello in static/hello.jpg',
          '--PARTIAL_CONTENT_BOUNDARY',
          'Content-Type: image/jpeg',
          'Content-Range: bytes 501-600/1000',
          '',
          'Hello in static/hello.jpg',
          '--PARTIAL_CONTENT_BOUNDARY--',
          '',
        ].join('\r\n')
      )
    })

    it('return 404 if not found', async () => {
      const partialContentSupport = vi.fn(async () => {
        throw new Error('Not found')
      })
      const app = new Hono().use(
        '*',
        baseServeStatic({
          getContent,
          partialContentSupport,
          onNotFound,
          onFound,
        })
      )

      const res = await app.request('/static/hello.jpg', {
        headers: {
          Range: 'bytes=-100',
        },
      })

      expect(getContent).not.toBeCalled()
      expect(partialContentSupport).toBeCalledTimes(1)
      expect(close).not.toBeCalled()
      expect(onFound).not.toBeCalled()
      expect(onNotFound).toBeCalledTimes(1)
      expect(res.status).toBe(404)
      expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/)
      expect(res.headers.get('Accept-Ranges')).toBeNull()
      expect(res.headers.get('Content-Range')).toBeNull()
      expect(res.headers.get('Content-Length')).toBeNull()
      expect(await res.text()).toBe('404 Not Found')
    })
  })
})
