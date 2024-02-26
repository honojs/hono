import { beforeEach, describe, expect, it } from 'vitest'
import { Hono } from '../../hono'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from '../../jsx'
import { poweredBy } from '../../middleware/powered-by'
import {
  SSG_DISABLED_RESPONSE,
  fetchRoutesContent,
  saveContentToFiles,
  ssgParams,
  toSSG,
  isSSGContext,
  disableSSG,
  onlySSG,
} from './index'
import type {
  BeforeRequestHook,
  AfterResponseHook,
  AfterGenerateHook,
  FileSystemModule,
} from './index'

describe('toSSG function', () => {
  let app: Hono

  const postParams = [{ post: '1' }, { post: '2' }]

  beforeEach(() => {
    app = new Hono()
    app.all('/', (c) => c.html('Hello, World!'))
    app.get('/about', (c) => c.html('About Page'))
    app.get('/about/some', (c) => c.text('About Page 2tier'))
    app.post('/about/some/thing', (c) => c.text('About Page 3tier'))
    app.get('/bravo', (c) => c.html('Bravo Page'))
    app.get('/Charlie', async (c, next) => {
      c.setRenderer((content, head) => {
        return c.html(
          <html>
            <head>
              <title>{head.title || ''}</title>
            </head>
            <body>
              <p>{content}</p>
            </body>
          </html>
        )
      })
      await next()
    })
    app.get('/Charlie', (c) => {
      return c.render('Hello!', { title: 'Charlies Page' })
    })

    // Included params
    app.get(
      '/post/:post',
      ssgParams(() => postParams),
      (c) => c.html(<h1>{c.req.param('post')}</h1>)
    )

    app.get(
      '/user/:user_id',
      ssgParams([{ user_id: '1' }, { user_id: '2' }, { user_id: '3' }]),
      (c) => c.html(<h1>{c.req.param('user_id')}</h1>)
    )

    type Env = {
      Bindings: {
        FOO_DB: string
      }
      Variables: {
        FOO_VAR: string
      }
    }

    app.get(
      '/env-type-check',
      ssgParams<Env>((c) => {
        expectTypeOf<typeof c.env.FOO_DB>().toBeString()
        expectTypeOf<typeof c.var.FOO_VAR>().toBeString()
        return []
      })
    )
  })
  it('Should correctly generate static HTML files for Hono routes', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    const htmlMap = await fetchRoutesContent(app)

    for (const postParam of postParams) {
      const html = htmlMap.get(`/post/${postParam.post}`)
      expect(html?.content).toBe(`<h1>${postParam.post}</h1>`)
    }

    for (let i = 1; i <= 3; i++) {
      const html = htmlMap.get(`/user/${i}`)
      expect(html?.content).toBe(`<h1>${i}</h1>`)
    }

    const files = await saveContentToFiles(htmlMap, fsMock, './static')

    expect(files.length).toBeGreaterThan(0)
    expect(fsMock.mkdir).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    })
    expect(fsMock.writeFile).toHaveBeenCalled()
  })

  it('Should handle file system errors correctly in saveContentToFiles', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.reject(new Error('Write error'))),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    try {
      const htmlMap = await fetchRoutesContent(app)
      await saveContentToFiles(htmlMap, fsMock, './static')
      expect(true).toBe(false) // This should not be reached
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe('Write error')
      } else {
        throw error
      }
    }
  })

  it('Should handle overall process errors correctly in toSSG', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.reject(new Error('Write error'))),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    const result = await toSSG(app, fsMock, { dir: './static' })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.files).toStrictEqual([])
  })

  it('Should correctly generate files with the expected paths', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    const htmlMap = await fetchRoutesContent(app)
    await saveContentToFiles(htmlMap, fsMock, './static')

    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about/some.txt', expect.any(String))
    expect(fsMock.writeFile).not.toHaveBeenCalledWith(
      'static/about/some/thing.txt',
      expect.any(String)
    )
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/bravo.html', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/Charlie.html', expect.any(String))
  })

  it('should modify the request if the hook is provided', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
    const beforeRequestHook: BeforeRequestHook = (req) => {
      if (req.method === 'GET') {
        return req
      }
      return false
    }
    const result = await toSSG(app, fsMock, { beforeRequestHook })
    expect(result.files).toHaveLength(10)
  })

  it('should skip the route if the request hook returns false', async () => {
    const beforeRequest: BeforeRequestHook = () => false
    const htmlMap = await fetchRoutesContent(app, beforeRequest)
    expect(htmlMap.size).toBe(0)
  })

  it('should modify the response if the hook is provided', async () => {
    const afterResponseHook: AfterResponseHook = (res) => {
      if (res.status === 200 || res.status === 500) {
        return res
      }
      return false
    }
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
    const result = await toSSG(app, fsMock, { afterResponseHook })
    expect(result.files).toHaveLength(10)
  })

  it('should skip the route if the response hook returns false', async () => {
    const afterResponse: AfterResponseHook = () => false
    const htmlMap = await fetchRoutesContent(app, undefined, afterResponse)
    expect(htmlMap.size).toBe(0)
  })

  it('should execute additional processing using afterGenerateHook', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
    const afterGenerateHookMock: AfterGenerateHook = vi.fn((result) => {
      if (result.files) {
        result.files.forEach((file) => console.log(file))
      }
    })

    await toSSG(app, fsMock, { dir: './static', afterGenerateHook: afterGenerateHookMock })

    expect(afterGenerateHookMock).toHaveBeenCalled()
    expect(afterGenerateHookMock).toHaveBeenCalledWith(expect.anything())
  })

  it('should avoid memory leak from `req.signal.addEventListener()`', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    const signalAddEventListener = vi.fn(() => {})
    const app = new Hono()
    app.get('/post/:post', ssgParams([{ post: '1' }, { post: '2' }]), (c) =>
      c.html(<h1>{c.req.param('post')}</h1>)
    )
    await toSSG(app, fsMock, {
      beforeRequestHook: (req) => {
        req.signal.addEventListener = signalAddEventListener
        return req
      },
    })

    expect(signalAddEventListener).not.toHaveBeenCalled()
  })
})

describe('fetchRoutesContent function', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.get('/text', (c) => c.text('Text Response'))
    app.get('/html', (c) => c.html('<p>HTML Response</p>'))
    app.get('/json', (c) => c.json({ message: 'JSON Response' }))
    app.use('*', poweredBy())
  })

  it('should fetch the correct content and MIME type for each route', async () => {
    const htmlMap = await fetchRoutesContent(app)
    expect(htmlMap.get('/text')).toEqual({
      content: 'Text Response',
      mimeType: 'text/plain',
    })
    expect(htmlMap.get('/html')).toEqual({
      content: '<p>HTML Response</p>',
      mimeType: 'text/html',
    })
    expect(htmlMap.get('/json')).toEqual({
      content: '{"message":"JSON Response"}',
      mimeType: 'application/json',
    })
  })

  it('should skip middleware routes', async () => {
    const htmlMap = await fetchRoutesContent(app)
    expect(htmlMap.has('*')).toBeFalsy()
  })

  it('should handle errors correctly', async () => {
    vi.spyOn(app, 'fetch').mockRejectedValue(new Error('Network error'))
    await expect(fetchRoutesContent(app)).rejects.toThrow('Network error')
    vi.restoreAllMocks()
  })
})

describe('saveContentToFiles function', () => {
  let fsMock: FileSystemModule
  let htmlMap: Map<string, { content: string | ArrayBuffer; mimeType: string }>
  // tar.gz, testdir/test.txt
  const gzFileBuffer = Buffer.from(
    'H4sIAAAAAAAAA+3SQQrCMBSE4aw9RU6gSc3LO0/FLgqukgj29qZgsQgqCEHE/9vMIoEMTMqQy3FMO9OQq1RkTq/i1rkwPkiMUXWvnXG+U/XGSstSi3MufbLWHIZ0mvLYP7v37vxHldv+c27LpbR4Yx44hvBi/3DfX3zdP0j9Eta1KPPoz/ef+mnz7Q4AAAAAAAAAAAAAAAAAPnMFqt1/BQAoAAA=',
    'base64'
  )
  const gzFileArrayBuffer = gzFileBuffer.buffer.slice(
    gzFileBuffer.byteOffset,
    gzFileBuffer.byteLength + gzFileBuffer.byteOffset
  )
  // PNG, red dot (1x1)
  const pngFileBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCCAAAALw',
    'base64'
  )
  const pngFileArrayBuffer = pngFileBuffer.buffer.slice(
    pngFileBuffer.byteOffset,
    pngFileBuffer.byteLength + pngFileBuffer.byteOffset
  )

  beforeEach(() => {
    fsMock = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
    htmlMap = new Map([
      ['/', { content: 'Home Page', mimeType: 'text/html' }],
      ['/index.html', { content: 'Home Page2', mimeType: 'text/html' }],
      ['/about', { content: 'About Page', mimeType: 'text/html' }],
      ['/about/', { content: 'About Page', mimeType: 'text/html' }],
      ['/bravo/index.html', { content: 'About Page', mimeType: 'text/html' }],
      ['/bravo/release-4.0.0', { content: 'Release 4.0.0', mimeType: 'text/html' }],
      ['/bravo/2024.02.18-sweet-memories', { content: 'Sweet Memories', mimeType: 'text/html' }],
      ['/bravo/deep.dive.to.html', { content: 'Deep Dive To HTML', mimeType: 'text/html' }],
      ['/bravo/alert.js', { content: 'alert("evil content")', mimeType: 'text/html' }],
      [
        '/bravo/index.tar.gz',
        {
          content: gzFileArrayBuffer,
          mimeType: 'application/gzip',
        },
      ],
      [
        '/bravo/dot.png',
        {
          content: pngFileArrayBuffer,
          mimeType: 'image/png',
        },
      ],
      ['/bravo.text/index.html', { content: 'About Page', mimeType: 'text/html' }],
      ['/bravo.text/', { content: 'Bravo Page', mimeType: 'text/html' }],
    ])
  })

  it('should correctly create files with the right content and paths', async () => {
    await saveContentToFiles(htmlMap, fsMock, './static')

    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', 'Home Page')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', 'Home Page2')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', 'About Page')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about/index.html', 'About Page')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/bravo/index.html', 'About Page')
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/bravo/release-4.0.0.html',
      'Release 4.0.0'
    )
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/bravo/deep.dive.to.html',
      'Deep Dive To HTML'
    )
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/bravo/2024.02.18-sweet-memories.html',
      'Sweet Memories'
    )
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/bravo/alert.js.html',
      'alert("evil content")'
    )
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/bravo.text/index.html', 'About Page')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/bravo.text/index.html', 'Bravo Page')

    // binary files
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/bravo/index.tar.gz',
      new Uint8Array(gzFileArrayBuffer)
    )
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/bravo/dot.png',
      new Uint8Array(pngFileArrayBuffer)
    )
  })

  it('should correctly create directories if they do not exist', async () => {
    await saveContentToFiles(htmlMap, fsMock, './static')

    expect(fsMock.mkdir).toHaveBeenCalledWith('static', { recursive: true })
  })

  it('should handle file writing or directory creation errors', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.reject(new Error('File write error'))),
    }

    await expect(saveContentToFiles(htmlMap, fsMock, './static')).rejects.toThrow(
      'File write error'
    )
  })
  it('check extensions', async () => {
    await saveContentToFiles(htmlMap, fsMock, './static')

    expect(fsMock.mkdir).toHaveBeenCalledWith('static', { recursive: true })
  })
})

describe('Dynamic route handling', () => {
  let app: Hono
  beforeEach(() => {
    app = new Hono()
    app.get('/shops/:id', (c) => c.html('Shop Page'))
    app.get('/shops/:id/:comments([0-9]+)', (c) => c.html('Comments Page'))
    app.get('/foo/*', (c) => c.html('Foo Page'))
    app.get('/foo:bar', (c) => c.html('Foo Bar Page'))
  })

  it('should skip /shops/:id dynamic route', async () => {
    const htmlMap = await fetchRoutesContent(app)
    expect(htmlMap.has('/shops/:id')).toBeFalsy()
  })

  it('should skip /shops/:id/:comments([0-9]+) dynamic route', async () => {
    const htmlMap = await fetchRoutesContent(app)
    expect(htmlMap.has('/shops/:id/:comments([0-9]+)')).toBeFalsy()
  })

  it('should skip /foo/* dynamic route', async () => {
    const htmlMap = await fetchRoutesContent(app)
    expect(htmlMap.has('/foo/*')).toBeFalsy()
  })

  it('should not skip /foo:bar dynamic route', async () => {
    const htmlMap = await fetchRoutesContent(app)
    expect(htmlMap.has('/foo:bar')).toBeTruthy()
  })
})

describe('isSSGContext()', () => {
  const app = new Hono()
  app.get('/', (c) => c.html(<h1>{isSSGContext(c) ? 'SSG' : 'noSSG'}</h1>))

  it('Should not generate the page if disableSSG is set', async () => {
    const htmlMap = await fetchRoutesContent(app)
    expect(await htmlMap.get('/')).toEqual({
      content: '<h1>SSG</h1>',
      mimeType: 'text/html',
    })
  })

  it('Should return 404 response if onlySSG() is set', async () => {
    const res = await app.request('/')
    expect(await res.text()).toBe('<h1>noSSG</h1>')
  })
})

describe('disableSSG/onlySSG middlewares', () => {
  const app = new Hono()
  app.get('/', (c) => c.html(<h1>Hello</h1>))
  app.get('/api', disableSSG(), (c) => c.text('an-api'))
  app.get('/disable-by-response', () => SSG_DISABLED_RESPONSE)
  app.get('/static-page', onlySSG(), (c) => c.html(<h1>Welcome to my site</h1>))

  it('Should not generate the page if disableSSG is set', async () => {
    const htmlMap = await fetchRoutesContent(app)
    expect(htmlMap.has('/')).toBe(true)
    expect(htmlMap.has('/static-page')).toBe(true)
    expect(htmlMap.has('/api')).toBe(false)
    expect(htmlMap.has('/disable-by-response')).toBe(false)
  })

  it('Should return 404 response if onlySSG() is set', async () => {
    const res = await app.request('/static-page')
    expect(res.status).toBe(404)
  })
})
