import { createMiddleware } from '../../helper'
import { Hono } from '../../hono'
import { serveStatic as baseServeStatic } from '.'

describe('Serve Static Middleware', () => {
  const app = new Hono()

  const serveStatic = createMiddleware(async (c, next) => {
    const mw = baseServeStatic({
      getContent: (path) => {
        if (path.endsWith('not-found.txt')) {
          return undefined
        }
        return `Hello in ${path}`
      },
      pathResolve: (path) => {
        return `./${path}`
      },
    })
    return await mw(c, next)
  })

  app.get('/static/*', serveStatic)

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

  it('Should decode URI strings - /static/%E7%82%8E.txt', async () => {
    const res = await app.request('/static/%E7%82%8E.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello in ./static/炎.txt')
  })

  it('Should return 404 response - /static/not-found', async () => {
    const res = await app.request('/static/not-found.txt')
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('404 Not Found')
  })

  it('Should not allow a directory traversal - /static/%2e%2e/static/hello.html', async () => {
    const res = await app.fetch({
      method: 'GET',
      url: 'http://localhost/static/%2e%2e/static/hello.html',
    } as Request)
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('404 Not Found')
  })
})
