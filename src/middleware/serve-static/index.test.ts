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
  })

  app.get('/static/*', serveStatic)

  beforeEach(() => {
    getContent.mockClear()
  })

  it('Should return 200 response - /static/hello.html', async () => {
    const res = await app.request('/static/hello.html')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in ./static/hello.html')
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
    expect(await res.text()).toBe('Hello in ./static/炎.txt')
  })

  it('Should return 404 response - /static/not-found', async () => {
    const res = await app.request('/static/not-found.txt')
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('404 Not Found')
    expect(getContent).toBeCalledTimes(1)
  })

  it('Should not allow a directory traversal - /static/%2e%2e/static/hello.html', async () => {
    const res = await app.fetch({
      method: 'GET',
      url: 'http://localhost/static/%2e%2e/static/hello.html',
    } as Request)
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('404 Not Found')
  })

  it('Should return pre-compressed response - /static/hello.html', async () => {
    const app = new Hono().use(
      '*',
      baseServeStatic({
        getContent,
        precompressed: true,
      })
    )

    const res = await app.request('/static/hello.html', {
      headers: { 'Accept-Encoding': 'gzip, deflate, br' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBe('br')
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in static/hello.html.br')
  })

  it('Should not return pre-compressed response - /static/hello.html', async () => {
    const app = new Hono().use(
      '*',
      baseServeStatic({
        getContent: vi.fn(async (path) => {
          if (/\.(br|zst|gz)$/.test(path)) {
            return null
          }
          return `Hello in ${path}`
        }),
        precompressed: true,
      })
    )

    const res = await app.request('/static/hello.html', {
      headers: { 'Accept-Encoding': 'gzip, deflate, br' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBeNull()
    expect(res.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('Hello in static/hello.html')
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
})
