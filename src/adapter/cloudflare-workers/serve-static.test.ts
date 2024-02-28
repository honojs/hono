import type { Context } from '../../context'
import { Hono } from '../../hono'
import type { Next } from '../../types'
import { serveStatic } from './serve-static'

// Mock
const store: Record<string, string> = {
  'assets/static/plain.abcdef.txt': 'This is plain.txt',
  'assets/static/hono.abcdef.html': '<h1>Hono!</h1>',
  'assets/static/top/index.abcdef.html': '<h1>Top</h1>',
  'static-no-root/plain.abcdef.txt': 'That is plain.txt',
  'assets/static/options/foo.abcdef.txt': 'With options',
  'assets/.static/plain.abcdef.txt': 'In the dot',
  'assets/static/video/morning-routine.abcdef.m3u8': 'Good morning',
  'assets/static/video/morning-routine1.abcdef.ts': 'Good',
  'assets/static/video/introduction.abcdef.mp4': 'Let me introduce myself',
  'assets/static/download': 'download',
}
const manifest = JSON.stringify({
  'assets/static/plain.txt': 'assets/static/plain.abcdef.txt',
  'assets/static/hono.html': 'assets/static/hono.abcdef.html',
  'assets/static/top/index.html': 'assets/static/top/index.abcdef.html',
  'static-no-root/plain.txt': 'static-no-root/plain.abcdef.txt',
  'assets/.static/plain.txt': 'assets/.static/plain.abcdef.txt',
  'assets/static/download': 'assets/static/download',
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
  const onNotFound = vi.fn(() => {})
  app.use('/static/*', serveStatic({ root: './assets', onNotFound, manifest }))
  app.use('/static-no-root/*', serveStatic({ manifest }))
  app.use(
    '/dot-static/*',
    serveStatic({
      root: './assets',
      rewriteRequestPath: (path) => path.replace(/^\/dot-static/, '/.static'),
      manifest,
    })
  )

  beforeEach(() => onNotFound.mockClear())

  it('Should return plain.txt', async () => {
    const res = await app.request('http://localhost/static/plain.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('This is plain.txt')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(onNotFound).not.toHaveBeenCalled()
  })

  it('Should return hono.html', async () => {
    const res = await app.request('http://localhost/static/hono.html')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>Hono!</h1>')
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(onNotFound).not.toHaveBeenCalled()
  })

  it('Should return 404 response', async () => {
    const res = await app.request('http://localhost/static/not-found.html')
    expect(res.status).toBe(404)
    expect(onNotFound).toHaveBeenCalledWith('assets/static/not-found.html', expect.anything())
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

  it('Should return plain.txt with a rewriteRequestPath option', async () => {
    const res = await app.request('http://localhost/dot-static/plain.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('In the dot')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  })
})

describe('With options', () => {
  const manifest = {
    'assets/static/options/foo.txt': 'assets/static/options/foo.abcdef.txt',
  }

  const app = new Hono()
  app.use('/static/*', serveStatic({ root: './assets', manifest: manifest }))

  it('Should return foo.txt', async () => {
    const res = await app.request('http://localhost/static/options/foo.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('With options')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  })
})

describe('With `file` options', () => {
  const app = new Hono()
  app.get('/foo/*', serveStatic({ path: './assets/static/hono.html', manifest }))
  app.get('/bar/*', serveStatic({ path: './static/hono.html', root: './assets', manifest }))

  it('Should return hono.html', async () => {
    const res = await app.request('http://localhost/foo/fallback')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>Hono!</h1>')
  })

  it('Should return hono.html - with `root` option', async () => {
    const res = await app.request('http://localhost/bar/fallback')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>Hono!</h1>')
  })
})

describe('With `mimes` options', () => {
  const mimes = {
    m3u8: 'application/vnd.apple.mpegurl',
    ts: 'video/mp2t',
  }
  const manifest = {
    'assets/static/video/morning-routine.m3u8': 'assets/static/video/morning-routine.abcdef.m3u8',
    'assets/static/video/morning-routine1.ts': 'assets/static/video/morning-routine1.abcdef.ts',
    'assets/static/video/introduction.mp4': 'assets/static/video/introduction.abcdef.mp4',
  }

  const app = new Hono()
  app.use('/static/*', serveStatic({ root: './assets', mimes, manifest }))

  it('Should return content-type of m3u8', async () => {
    const res = await app.request('http://localhost/static/video/morning-routine.m3u8')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/vnd.apple.mpegurl')
  })
  it('Should return content-type of ts', async () => {
    const res = await app.request('http://localhost/static/video/morning-routine1.ts')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('video/mp2t')
  })
  it('Should return content-type of default on Hono', async () => {
    const res = await app.request('http://localhost/static/video/introduction.mp4')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('video/mp4')
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
  app.use('/static/*', md2)
  app.use('/static/*', serveStatic({ root: './assets', manifest }))
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

  it('Should handle a file without an extension', async () => {
    const res = await app.request('http://localhost/static/download')
    expect(res.status).toBe(200)
  })
})

describe('Types of middleware', () => {
  it('Should pass env type from generics of serveStatic', async () => {
    type Env = {
      Bindings: {
        HOGE: string
      }
    }
    const app = new Hono<Env>()
    app.use(
      '/static/*',
      serveStatic<Env>({
        root: './assets',
        onNotFound: (_, c) => {
          expectTypeOf(c.env).toEqualTypeOf<Env['Bindings']>()
        },
        manifest,
      })
    )
  })
})
