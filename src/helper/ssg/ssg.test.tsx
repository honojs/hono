/* eslint-disable @typescript-eslint/no-unused-vars */
/** @jsxImportSource ../../jsx */
import { Hono } from '../../hono'
import { poweredBy } from '../../middleware/powered-by'
import {
  X_HONO_DISABLE_SSG_HEADER_KEY,
  disableSSG,
  isSSGContext,
  onlySSG,
  ssgParams,
} from './middleware'
import { redirectPlugin } from './plugins'
import {
  defaultExtensionMap,
  fetchRoutesContent,
  saveContentToFile,
  toSSG,
  defaultPlugin,
} from './ssg'
import type {
  AfterGenerateHook,
  AfterResponseHook,
  BeforeRequestHook,
  FileSystemModule,
  ToSSGResult,
  SSGPlugin,
  ToSSGOptions,
} from './ssg'

const resolveRoutesContent = async (res: ReturnType<typeof fetchRoutesContent>) => {
  const htmlMap = new Map<string, { content: string | ArrayBuffer; mimeType: string }>()
  for (const getInfoPromise of res) {
    const getInfo = await getInfoPromise
    if (!getInfo) {
      continue
    }
    for (const dataPromise of getInfo) {
      const data = await dataPromise
      if (!data) {
        continue
      }
      htmlMap.set(data.routePath, {
        content: data.content,
        mimeType: data.mimeType,
      })
    }
  }
  return htmlMap
}

describe('toSSG function', () => {
  let app: Hono
  let fsMock: FileSystemModule

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

    fsMock = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
  })
  it('Should correctly generate static HTML files for Hono routes', async () => {
    const writtenFiles: Record<string, string> = {}
    const fsMock: FileSystemModule = {
      writeFile: (path, data) => {
        writtenFiles[path] = typeof data === 'string' ? data : data.toString()
        return Promise.resolve()
      },
      mkdir: vi.fn(() => Promise.resolve()),
    }

    const result = await toSSG(app, fsMock, { dir: './static' })

    for (const postParam of postParams) {
      const html = writtenFiles[`static/post/${postParam.post}.html`]
      expect(html).toBe(`<h1>${postParam.post}</h1>`)
    }

    for (let i = 1; i <= 3; i++) {
      const html = writtenFiles[`static/user/${i}.html`]
      expect(html).toBe(`<h1>${i}</h1>`)
    }

    expect(result.files.length).toBe(10)
    expect(fsMock.mkdir).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    })
  })

  it('Should handle file system errors correctly in saveContentToFiles', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.reject(new Error('Write error'))),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    const result = await toSSG(app, fsMock, { dir: './static' })
    expect(result.success).toBe(false)
    expect(result.files).toStrictEqual([])
    expect(result.error?.message).toBe('Write error')
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
    app.get('/data', (c) =>
      c.text(JSON.stringify({ title: 'hono' }), 200, {
        'Content-Type': 'text/x-foo',
      })
    )
    await toSSG(app, fsMock, {
      dir: './static',
      extensionMap: {
        ...defaultExtensionMap,
        'text/x-foo': 'foo',
      },
    })

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
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/data.foo', expect.any(String))
  })

  it('should modify the request if the hook is provided', async () => {
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
    const result = await toSSG(app, fsMock, { beforeRequestHook: beforeRequest })
    expect(result.success).toBe(true)
    expect(result.files).toStrictEqual([])
  })

  it('should modify the response if the hook is provided', async () => {
    const afterResponseHook: AfterResponseHook = (res) => {
      if (res.status === 200 || res.status === 500) {
        return res
      }
      return false
    }
    const result = await toSSG(app, fsMock, { afterResponseHook })
    expect(result.files).toHaveLength(10)
  })

  it('should skip the route if the response hook returns false', async () => {
    const afterResponse: AfterResponseHook = () => false
    const result = await toSSG(app, fsMock, { afterResponseHook: afterResponse })
    expect(result.success).toBe(true)
    expect(result.files).toStrictEqual([])
  })

  it('should execute additional processing using afterGenerateHook', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
    const afterGenerateHookMock: AfterGenerateHook = vi.fn<AfterGenerateHook>(
      (result, fsModule, options) => {
        if (result.files) {
          result.files.forEach((file) => console.log(file))
        }
      }
    )

    await toSSG(app, fsMock, { dir: './static', afterGenerateHook: afterGenerateHookMock })

    expect(afterGenerateHookMock).toHaveBeenCalled()
    expect(afterGenerateHookMock).toHaveBeenCalledWith(
      expect.anything(), // result
      expect.anything(), // fsModule
      expect.anything() // options
    )
  })

  it('should generate redirect HTML for 301/302 route responses using plugin', async () => {
    const writtenFiles: Record<string, string> = {}
    const fsMock: FileSystemModule = {
      writeFile: (path, data) => {
        writtenFiles[path] = typeof data === 'string' ? data : data.toString()
        return Promise.resolve()
      },
      mkdir: vi.fn(() => Promise.resolve()),
    }
    const app = new Hono()
    app.get('/old', (c) => c.redirect('/new'))
    app.get('/new', (c) => c.html('New Page'))

    await toSSG(app, fsMock, { dir: './static', plugins: [redirectPlugin()] })

    expect(writtenFiles['static/old.html']).toBeDefined()
    const content = writtenFiles['static/old.html']
    // Should contain meta refresh
    expect(content).toContain('meta http-equiv="refresh" content="0;url=/new"')
    // Should contain canonical
    expect(content).toContain('rel="canonical" href="/new"')
    // Should contain robots noindex
    expect(content).toContain('<meta name="robots" content="noindex" />')
    // Should contain link anchor
    expect(content).toContain('<a href="/new">Redirecting from')
  })

  it('should skip generating a redirect HTML when 301/302 has no Location header', async () => {
    const writtenFiles: Record<string, string> = {}
    const fsMock: FileSystemModule = {
      writeFile: (path, data) => {
        writtenFiles[path] = typeof data === 'string' ? data : data.toString()
        return Promise.resolve()
      },
      mkdir: vi.fn(() => Promise.resolve()),
    }
    const app = new Hono()
    // Return a 301 without Location header
    app.get('/bad', (c) => new Response(null, { status: 301 }))

    await toSSG(app, fsMock, { dir: './static', plugins: [redirectPlugin()] })

    expect(writtenFiles['static/bad.html']).toBeUndefined()
  })

  it('should handle asynchronous beforeRequestHook correctly', async () => {
    const beforeRequestHook: BeforeRequestHook = async (req) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (req.url.includes('/skip')) {
        return false
      }
      return req
    }

    const result = await toSSG(app, fsMock, { beforeRequestHook })
    expect(result.files).not.toContain(expect.stringContaining('/skip'))
    expect(result.success).toBe(true)
    expect(result.files.length).toBeGreaterThan(0)
  })

  it('should handle asynchronous afterResponseHook correctly', async () => {
    const afterResponseHook: AfterResponseHook = async (res) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (res.headers.get('X-Skip') === 'true') {
        return false
      }
      return res
    }

    const result = await toSSG(app, fsMock, { afterResponseHook })
    expect(result.files).not.toContain(expect.stringContaining('/skip'))
    expect(result.success).toBe(true)
    expect(result.files.length).toBeGreaterThan(0)
  })

  it('should handle asynchronous afterGenerateHook correctly', async () => {
    const afterGenerateHook: AfterGenerateHook = async (result, fsModule, options) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      console.log(`Generated ${result.files.length} files.`)
    }

    const result = await toSSG(app, fsMock, { afterGenerateHook })
    expect(result.success).toBe(true)
    expect(result.files.length).toBeGreaterThan(0)
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
    app.get('/text-utf8', (c) => {
      return c.text('Text Response', 200, { 'Content-Type': 'text/plain;charset=UTF-8' })
    })
    app.get('/html', (c) => c.html('<p>HTML Response</p>'))
    app.get('/json', (c) => c.json({ message: 'JSON Response' }))
    app.use('*', poweredBy())
  })

  it('should fetch the correct content and MIME type for each route', async () => {
    const htmlMap = await resolveRoutesContent(fetchRoutesContent(app))

    expect(htmlMap.get('/text')).toEqual({
      content: 'Text Response',
      mimeType: 'text/plain',
    })
    expect(htmlMap.get('/text-utf8')).toEqual({
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
    const htmlMap = await resolveRoutesContent(fetchRoutesContent(app))
    expect(htmlMap.has('*')).toBeFalsy()
  })

  it('should handle errors correctly', async () => {
    vi.spyOn(app, 'fetch').mockRejectedValue(new Error('Network error'))
    await expect(resolveRoutesContent(fetchRoutesContent(app))).rejects.toThrow('Network error')
    vi.restoreAllMocks()
  })
})

describe('saveContentToFile function', () => {
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

  const fileData = [
    { routePath: '/', content: 'Home Page', mimeType: 'text/html' },
    { routePath: '/index.html', content: 'Home Page2', mimeType: 'text/html' },
    { routePath: '/about', content: 'About Page', mimeType: 'text/html' },
    { routePath: '/about/', content: 'About Page', mimeType: 'text/html' },
    { routePath: '/bravo/index.html', content: 'About Page', mimeType: 'text/html' },
    { routePath: '/bravo/release-4.0.0', content: 'Release 4.0.0', mimeType: 'text/html' },
    {
      routePath: '/bravo/2024.02.18-sweet-memories',
      content: 'Sweet Memories',
      mimeType: 'text/html',
    },
    { routePath: '/bravo/deep.dive.to.html', content: 'Deep Dive To HTML', mimeType: 'text/html' },
    { routePath: '/bravo/alert.js', content: 'alert("evil content")', mimeType: 'text/html' },
    { routePath: '/bravo.text/index.html', content: 'About Page', mimeType: 'text/html' },
    { routePath: '/bravo.text/', content: 'Bravo Page', mimeType: 'text/html' },
    {
      routePath: '/bravo/index.tar.gz',
      content: gzFileArrayBuffer,
      mimeType: 'application/gzip',
    },
    {
      routePath: '/bravo/dot.png',
      content: pngFileArrayBuffer,
      mimeType: 'image/png',
    },
  ]

  let fsMock: FileSystemModule

  beforeEach(() => {
    fsMock = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
  })

  it('should correctly create files with the right content and paths', async () => {
    for (const data of fileData) {
      await saveContentToFile(Promise.resolve(data), fsMock, './static')
    }

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
    await saveContentToFile(
      Promise.resolve({
        routePath: '/new-dir/index.html',
        content: 'New Page',
        mimeType: 'text/html',
      }),
      fsMock,
      './static'
    )
    expect(fsMock.mkdir).toHaveBeenCalledWith('static/new-dir', { recursive: true })
  })

  it('should handle file writing or directory creation errors', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.reject(new Error('File write error'))),
    }

    await expect(
      saveContentToFile(
        Promise.resolve({
          routePath: '/error-dir/index.html',
          content: 'New Page',
          mimeType: 'text/html',
        }),
        fsMock,
        './static'
      )
    ).rejects.toThrow('File write error')
  })
  it('check extensions', async () => {
    for (const data of fileData) {
      await saveContentToFile(Promise.resolve(data), fsMock, './static-check-extensions')
    }
    expect(fsMock.mkdir).toHaveBeenCalledWith('static-check-extensions', { recursive: true })
  })

  it('should correctly create .yaml files for YAML content', async () => {
    const yamlContent = 'title: YAML Example\nvalue: This is a YAML file.'
    const mimeType = 'application/yaml'
    const routePath = '/example'

    const yamlData = {
      routePath: routePath,
      content: yamlContent,
      mimeType: mimeType,
    }

    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    await saveContentToFile(Promise.resolve(yamlData), fsMock, './static')

    expect(fsMock.writeFile).toHaveBeenCalledWith('static/example.yaml', yamlContent)
  })

  it('should correctly create .yml files for YAML content', async () => {
    const yamlContent = 'title: YAML Example\nvalue: This is a YAML file.'
    const yamlMimeType = 'application/yaml'
    const yamlRoutePath = '/yaml'

    const yamlData = {
      routePath: yamlRoutePath,
      content: yamlContent,
      mimeType: yamlMimeType,
    }

    const yamlMimeType2 = 'x-yaml'
    const yamlRoutePath2 = '/yaml2'
    const yamlData2 = {
      routePath: yamlRoutePath2,
      content: yamlContent,
      mimeType: yamlMimeType2,
    }

    const htmlMimeType = 'text/html'
    const htmlRoutePath = '/html'

    const htmlData = {
      routePath: htmlRoutePath,
      content: yamlContent,
      mimeType: htmlMimeType,
    }

    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    const extensionMap = {
      'application/yaml': 'yml',
      'x-yaml': 'xyml',
    }
    await saveContentToFile(Promise.resolve(yamlData), fsMock, './static', extensionMap)
    await saveContentToFile(Promise.resolve(yamlData2), fsMock, './static', extensionMap)
    await saveContentToFile(Promise.resolve(htmlData), fsMock, './static', extensionMap)
    await saveContentToFile(Promise.resolve(htmlData), fsMock, './static', {
      ...defaultExtensionMap,
      ...extensionMap,
    })

    expect(fsMock.writeFile).toHaveBeenCalledWith('static/yaml.yml', yamlContent)
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/yaml2.xyml', yamlContent)
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/html.htm', yamlContent) // extensionMap
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/html.html', yamlContent) // default + extensionMap
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
    const htmlMap = await resolveRoutesContent(fetchRoutesContent(app))
    expect(htmlMap.has('/shops/:id')).toBeFalsy()
  })

  it('should skip /shops/:id/:comments([0-9]+) dynamic route', async () => {
    const htmlMap = await resolveRoutesContent(fetchRoutesContent(app))
    expect(htmlMap.has('/shops/:id/:comments([0-9]+)')).toBeFalsy()
  })

  it('should skip /foo/* dynamic route', async () => {
    const htmlMap = await resolveRoutesContent(fetchRoutesContent(app))
    expect(htmlMap.has('/foo/*')).toBeFalsy()
  })

  it('should not skip /foo:bar dynamic route', async () => {
    const htmlMap = await resolveRoutesContent(fetchRoutesContent(app))
    expect(htmlMap.has('/foo:bar')).toBeTruthy()
  })
})

describe('isSSGContext()', () => {
  const app = new Hono()
  app.get('/', (c) => c.html(<h1>{isSSGContext(c) ? 'SSG' : 'noSSG'}</h1>))

  const fsMock: FileSystemModule = {
    writeFile: vi.fn(() => Promise.resolve()),
    mkdir: vi.fn(() => Promise.resolve()),
  }

  it('Should not generate the page if disableSSG is set', async () => {
    await toSSG(app, fsMock, { dir: './static' })
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', '<h1>SSG</h1>')
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
  app.get('/disable-by-response', (c) =>
    c.text('', 404, { [X_HONO_DISABLE_SSG_HEADER_KEY]: 'true' })
  )
  app.get('/static-page', onlySSG(), (c) => c.html(<h1>Welcome to my site</h1>))

  const fsMock: FileSystemModule = {
    writeFile: vi.fn(() => Promise.resolve()),
    mkdir: vi.fn(() => Promise.resolve()),
  }

  it('Should not generate the page if disableSSG is set', async () => {
    await toSSG(app, fsMock, { dir: './static' })
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/static-page.html', expect.any(String))
    expect(fsMock.writeFile).not.toHaveBeenCalledWith('static/api.html', expect.any(String))
    expect(fsMock.writeFile).not.toHaveBeenCalledWith(
      'static/disable-by-response.html',
      expect.any(String)
    )
  })

  it('Should return 404 response if onlySSG() is set', async () => {
    const res = await app.request('/static-page')
    expect(res.status).toBe(404)
  })
})

describe('Request hooks - filterPathsBeforeRequestHook and denyPathsBeforeRequestHook', () => {
  let app: Hono
  let fsMock: FileSystemModule

  const filterPathsBeforeRequestHook = (allowedPaths: string | string[]): BeforeRequestHook => {
    const baseURL = 'http://localhost'
    return async (req: Request): Promise<Request | false> => {
      const paths = Array.isArray(allowedPaths) ? allowedPaths : [allowedPaths]
      const pathname = new URL(req.url, baseURL).pathname

      if (paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        return req
      }

      return false
    }
  }

  const denyPathsBeforeRequestHook = (deniedPaths: string | string[]): BeforeRequestHook => {
    const baseURL = 'http://localhost'
    return async (req: Request): Promise<Request | false> => {
      const paths = Array.isArray(deniedPaths) ? deniedPaths : [deniedPaths]
      const pathname = new URL(req.url, baseURL).pathname

      if (!paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        return req
      }
      return false
    }
  }

  beforeEach(() => {
    app = new Hono()
    app.get('/allowed-path', (c) => c.html('Allowed Path Page'))
    app.get('/denied-path', (c) => c.html('Denied Path Page'))
    app.get('/other-path', (c) => c.html('Other Path Page'))

    fsMock = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
  })

  it('should only process requests for allowed paths with filterPathsBeforeRequestHook', async () => {
    const allowedPathsHook = filterPathsBeforeRequestHook(['/allowed-path'])

    const result = await toSSG(app, fsMock, {
      dir: './static',
      beforeRequestHook: allowedPathsHook,
    })

    expect(result.files.some((file) => file.includes('allowed-path.html'))).toBe(true)
    expect(result.files.some((file) => file.includes('other-path.html'))).toBe(false)
  })

  it('should deny requests for specified paths with denyPathsBeforeRequestHook', async () => {
    const deniedPathsHook = denyPathsBeforeRequestHook(['/denied-path'])

    const result = await toSSG(app, fsMock, { dir: './static', beforeRequestHook: deniedPathsHook })

    expect(result.files.some((file) => file.includes('denied-path.html'))).toBe(false)

    expect(result.files.some((file) => file.includes('allowed-path.html'))).toBe(true)
    expect(result.files.some((file) => file.includes('other-path.html'))).toBe(true)
  })
})

describe('Combined Response hooks - modify response content', () => {
  let app: Hono
  let fsMock: FileSystemModule

  const prependContentAfterResponseHook = (prefix: string): AfterResponseHook => {
    return async (res: Response): Promise<Response> => {
      const originalText = await res.text()
      return new Response(`${prefix}${originalText}`, res)
    }
  }

  const appendContentAfterResponseHook = (suffix: string): AfterResponseHook => {
    return async (res: Response): Promise<Response> => {
      const originalText = await res.text()
      return new Response(`${originalText}${suffix}`, res)
    }
  }

  beforeEach(() => {
    app = new Hono()
    app.get('/content-path', (c) => c.text('Original Content'))

    fsMock = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
  })

  it('should modify response content with combined AfterResponseHooks', async () => {
    const prefixHook = prependContentAfterResponseHook('Prefix-')
    const suffixHook = appendContentAfterResponseHook('-Suffix')

    const combinedHook = [prefixHook, suffixHook]

    await toSSG(app, fsMock, {
      dir: './static',
      afterResponseHook: combinedHook,
    })

    // Assert that the response content is modified by both hooks
    // This assumes you have a way to inspect the content of saved files or you need to mock/stub the Response text method correctly.
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/content-path.txt',
      'Prefix-Original Content-Suffix'
    )
  })
})

describe('Combined Generate hooks - AfterGenerateHook', () => {
  let app: Hono
  let fsMock: FileSystemModule

  const logResultAfterGenerateHook = (): AfterGenerateHook => {
    return async (
      result: ToSSGResult,
      fsModule: FileSystemModule,
      options?: ToSSGOptions
    ): Promise<void> => {
      console.log('Generation completed with status:', result.success) // Log the generation success
    }
  }

  const appendFilesAfterGenerateHook = (additionalFiles: string[]): AfterGenerateHook => {
    return async (
      result: ToSSGResult,
      fsModule: FileSystemModule,
      options?: ToSSGOptions
    ): Promise<void> => {
      result.files = result.files.concat(additionalFiles) // Append additional files to the result
    }
  }

  beforeEach(() => {
    app = new Hono()
    app.get('/path', (c) => c.text('Page Content'))

    fsMock = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
  })

  it('should execute combined AfterGenerateHooks affecting the result', async () => {
    const logHook = logResultAfterGenerateHook()
    const appendHook = appendFilesAfterGenerateHook(['/extra/file1.html', '/extra/file2.html'])

    const combinedHook = [logHook, appendHook]

    const consoleSpy = vi.spyOn(console, 'log')
    const result = await toSSG(app, fsMock, {
      dir: './static',
      afterGenerateHook: combinedHook,
    })

    // Check that the log function was called correctly
    expect(consoleSpy).toHaveBeenCalledWith('Generation completed with status:', true)

    // Check that additional files were appended to the result
    expect(result.files).toContain('/extra/file1.html')
    expect(result.files).toContain('/extra/file2.html')
  })
})

describe('SSG Plugin System', () => {
  let app: Hono
  let fsMock: FileSystemModule

  beforeEach(() => {
    app = new Hono()
    app.get('/', (c) => c.html('<h1>Home</h1>'))
    app.get('/about', (c) => c.html('<h1>About</h1>'))
    app.get('/blog', (c) => c.html('<h1>Blog</h1>'))
    app.get('/created', (c) => c.text('201 Created', 201))
    app.get('/redirect', (c) => c.redirect('/'))
    app.get('/notfound', (c) => c.notFound())
    app.get('/error', (c) => c.text('500 Error', 500))

    fsMock = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
  })

  it('should use defaultPlugin when plugins option is omitted', async () => {
    // @ts-expect-error defaultPlugin has afterResponseHook
    const defaultPluginSpy = vi.spyOn(defaultPlugin, 'afterResponseHook')
    await toSSG(app, fsMock, { dir: './static' })
    expect(defaultPluginSpy).toHaveBeenCalled()
    defaultPluginSpy.mockRestore()
  })

  it('should skip non-200 responses with defaultPlugin', async () => {
    const result = await toSSG(app, fsMock, { plugins: [defaultPlugin], dir: './static' })
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', '<h1>Home</h1>')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', '<h1>About</h1>')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/blog.html', '<h1>Blog</h1>')
    expect(fsMock.writeFile).not.toHaveBeenCalledWith('static/created.txt', expect.any(String))
    expect(fsMock.writeFile).not.toHaveBeenCalledWith('static/redirect.txt', expect.any(String))
    expect(fsMock.writeFile).not.toHaveBeenCalledWith('static/notfound.txt', expect.any(String))
    expect(fsMock.writeFile).not.toHaveBeenCalledWith('static/error.txt', expect.any(String))
    expect(result.files.some((f) => f.includes('created'))).toBe(false)
    expect(result.files.some((f) => f.includes('redirect'))).toBe(false)
    expect(result.files.some((f) => f.includes('notfound'))).toBe(false)
    expect(result.files.some((f) => f.includes('error'))).toBe(false)
    expect(result.success).toBe(true)
  })

  it('should correctly apply plugins with beforeRequestHook', async () => {
    const plugin: SSGPlugin = {
      beforeRequestHook: (req) => {
        // Skip requests to the blog page
        const url = new URL(req.url)
        if (url.pathname === '/blog') {
          return false
        }
        return req
      },
    }

    const result = await toSSG(app, fsMock, {
      plugins: [plugin],
    })

    expect(result.files).toHaveLength(6)
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', '<h1>Home</h1>')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', '<h1>About</h1>')
    expect(fsMock.writeFile).not.toHaveBeenCalledWith('static/blog.html', '<h1>Blog</h1>')
  })

  it('should correctly apply plugins with afterResponseHook', async () => {
    const plugin: SSGPlugin = {
      afterResponseHook: async (res) => {
        const text = await res.text()
        return new Response(text.replace('</h1>', ' - Modified</h1>'), res)
      },
    }

    await toSSG(app, fsMock, {
      plugins: [plugin],
    })

    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', '<h1>Home - Modified</h1>')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', '<h1>About - Modified</h1>')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/blog.html', '<h1>Blog - Modified</h1>')
  })

  it('should correctly apply plugins with afterGenerateHook', async () => {
    const additionalFiles = ['sitemap.xml', 'robots.txt']
    const plugin: SSGPlugin = {
      afterGenerateHook: (result) => {
        result.files.push(...additionalFiles)
      },
    }

    const result = await toSSG(app, fsMock, {
      plugins: [plugin],
    })

    expect(result.files).toContain('sitemap.xml')
    expect(result.files).toContain('robots.txt')
  })

  it('should correctly combine multiple plugins', async () => {
    const skipBlogPlugin: SSGPlugin = {
      beforeRequestHook: (req) => {
        const url = new URL(req.url)
        if (url.pathname === '/blog') {
          return false
        }
        return req
      },
    }

    const prefixPlugin: SSGPlugin = {
      afterResponseHook: async (res) => {
        const text = await res.text()
        return new Response(`[Prefix] ${text}`, res)
      },
    }

    const sitemapPlugin: SSGPlugin = {
      afterGenerateHook: (result, fsModule, options) => {
        result.files.push('sitemap.xml')
      },
    }

    const result = await toSSG(app, fsMock, {
      plugins: [skipBlogPlugin, prefixPlugin, sitemapPlugin],
    })

    expect(result.files).toHaveLength(7)
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', '[Prefix] <h1>Home</h1>')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', '[Prefix] <h1>About</h1>')
    expect(fsMock.writeFile).not.toHaveBeenCalledWith('static/blog.html', expect.any(String))
    expect(result.files).toContain('sitemap.xml')
  })

  it('should correctly combine plugin hooks with option hooks', async () => {
    const plugin: SSGPlugin = {
      afterResponseHook: async (res) => {
        const text = await res.text()
        return new Response(`${text} [Plugin]`, res)
      },
    }

    const afterResponseHook: AfterResponseHook = async (res) => {
      const text = await res.text()
      return new Response(`${text} [Option]`, res)
    }

    await toSSG(app, fsMock, {
      plugins: [plugin],
      afterResponseHook,
    })

    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/index.html',
      '<h1>Home</h1> [Option] [Plugin]'
    )
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/about.html',
      '<h1>About</h1> [Option] [Plugin]'
    )
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      'static/blog.html',
      '<h1>Blog</h1> [Option] [Plugin]'
    )
  })
})

describe('ssgParams', () => {
  it('should invoke callback only once', async () => {
    const app = new Hono()
    const cb = vi.fn(() => [{ post: '1' }, { post: '2' }])
    app.get('/post/:post', ssgParams(cb), (c) => c.html(<h1>{c.req.param('post')}</h1>))
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
    await toSSG(app, fsMock)

    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('should not invoke handler after ssgParams for dynamic route request', async () => {
    const app = new Hono()
    const log = vi.fn()
    app.get(
      '/shops/:id',
      ssgParams(() => [{ id: 'shop1' }]),
      async (c) => {
        const id = c.req.param('id')
        log(id)
        return c.html(id)
      }
    )
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
    await toSSG(app, fsMock)

    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith('shop1')
    expect(fsMock.writeFile).toHaveBeenCalledTimes(1)
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/shops/shop1.html', 'shop1')
  })
})
