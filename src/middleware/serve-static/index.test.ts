import type { Context } from '../../context'
import type { Next } from '../../hono'
import { Hono } from '../../hono'
import { serveStatic } from '.'

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

  it('Should return plain.txt', async () => {
    const res = await app.request('http://localhost/static/plain.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('This is plain.txt')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  })

  it('Should return hono.html', async () => {
    const res = await app.request('http://localhost/static/hono.html')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>Hono!</h1>')
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('Should return 404 response', async () => {
    const res = await app.request('http://localhost/static/not-found.html')
    expect(res.status).toBe(404)
  })

  it('Should return plan.txt', async () => {
    const res = await app.request('http://localhost/static-no-root/plain.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('That is plain.txt')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  })

  it('Should return index.html', async () => {
    const res = await app.request('http://localhost/static/top')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>Top</h1>')
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })
})

describe('With middleware', () => {
  const app = new Hono()
  const md1 = async (c: Context, next: Next) => {
    await next()
    c.res.headers.append('x-foo', 'bar')
  }
  const md2 = async (c: Context, next: Next) => {
    await next()
    c.res.headers.append('x-foo2', 'bar2')
  }

  app.use('/static/*', md1)
  app.use('/static/*', serveStatic({ root: './assets' }))
  app.use('/static/*', md2)
  app.get('/static/foo', (c) => {
    return c.text('bar')
  })

  it('Should return plain.txt with correct headers', async () => {
    const res = await app.request('http://localhost/static/plain.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('This is plain.txt')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('x-foo')).toBe('bar')
    expect(res.headers.get('x-foo2')).toBe('bar2')
  })

  it('Should return 200 Response', async () => {
    const res = await app.request('http://localhost/static/foo')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('bar')
  })
})
