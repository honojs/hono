import { Hono } from '../../hono'
import { serveStatic } from './serve-static'

// Mock
const store: { [key: string]: string } = {
  'assets/static/plain.abcdef.txt': 'This is plain.txt',
  'assets/static/hono.abcdef.html': '<h1>Hono!</h1>',
  'assets/static/top/index.abcdef.html': '<h1>Top</h1>',
  'static-no-root/plain.abcdef.txt': 'That is plain.txt',
}
const manifest = JSON.stringify({
  'assets/static/plain.txt': 'assets/static/plain.abcdef.txt',
  'assets/static/hono.html': 'assets/static/hono.abcdef.html',
  'assets/static/top/index.html': 'assets/static/top/index.abcdef.html',
  'static-no-root/plain.txt': 'static-no-root/plain.abcdef.txt',
})

Object.assign(global, { __STATIC_CONTENT_MANIFEST: manifest })
Object.assign(global, {
  __STATIC_CONTENT: {
    get: (path: string) => {
      return store[path]
    },
  },
})

describe('ServeStatic Middleware', () => {
  const app = new Hono()

  app.use('/static/*', serveStatic({ root: './assets' }))
  app.use('/static-no-root/*', serveStatic())

  it('Serve static files', async () => {
    let req = new Request('http://localhost/static/plain.txt')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('This is plain.txt')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('Content-Length')).toBe('17')

    req = new Request('http://localhost/static/hono.html')
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>Hono!</h1>')
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('Content-Length')).toBe('14')

    req = new Request('http://localhost/static/not-found.html')
    res = await app.dispatch(req)
    expect(res.status).toBe(404)

    req = new Request('http://localhost/static-no-root/plain.txt')
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('That is plain.txt')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('Content-Length')).toBe('17')
  })

  it('Serve index.html', async () => {
    const req = new Request('http://localhost/static/top')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>Top</h1>')
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('Content-Length')).toBe('12')
  })
})
