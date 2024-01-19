import { beforeEach, describe, expect, it } from 'vitest'
import { Hono } from '../../hono'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from '../../jsx'
import { poweredBy } from '../../middleware/powered-by'
import { fetchRoutesContent, isSSG, isSSR, saveContentToFiles, ssgParams, toSSG } from './index'
import type { FileSystemModule } from './index'

describe('toSSG function', () => {
  let app: Hono

  const postParams = [{ post: '1' }, { post: '2' }]

  beforeEach(() => {
    app = new Hono()
    app.get('/', (c) => c.html('Hello, World!'))
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
  })
  it('Should correctly generate static HTML files for Hono routes', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    const htmlMap = await fetchRoutesContent(app, {})

    for (const postParam of postParams) {
      const html = htmlMap.get(`/post/${postParam.post}`)
      expect(html?.content).toBe(`<h1>${postParam.post}</h1>`)
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
      const htmlMap = await fetchRoutesContent(app, {})
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
    expect(result.files).toBeUndefined()
  })

  it('Should correctly generate files with the expected paths', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }

    const htmlMap = await fetchRoutesContent(app, {})
    await saveContentToFiles(htmlMap, fsMock, './static')

    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about/some.txt', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about/some/thing.txt', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/bravo.html', expect.any(String))
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/Charlie.html', expect.any(String))
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
    const htmlMap = await fetchRoutesContent(app, {})
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
    const htmlMap = await fetchRoutesContent(app, {})
    expect(htmlMap.has('*')).toBeFalsy()
  })

  it('should handle errors correctly', async () => {
    vi.spyOn(app, 'fetch').mockRejectedValue(new Error('Network error'))
    await expect(fetchRoutesContent(app, {})).rejects.toThrow('Network error')
    vi.restoreAllMocks()
  })
})

describe('saveContentToFiles function', () => {
  let fsMock: FileSystemModule
  let htmlMap: Map<string, { content: string | ArrayBuffer; mimeType: string }>

  beforeEach(() => {
    fsMock = {
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
    }
    htmlMap = new Map([
      ['/', { content: 'Home Page', mimeType: 'text/html' }],
      ['/about', { content: 'About Page', mimeType: 'text/html' }],
    ])
  })

  it('should correctly create files with the right content and paths', async () => {
    await saveContentToFiles(htmlMap, fsMock, './static')

    expect(fsMock.writeFile).toHaveBeenCalledWith('static/index.html', 'Home Page')
    expect(fsMock.writeFile).toHaveBeenCalledWith('static/about.html', 'About Page')
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
    const htmlMap = await fetchRoutesContent(app, {})
    expect(htmlMap.has('/shops/:id')).toBeFalsy()
  })

  it('should skip /shops/:id/:comments([0-9]+) dynamic route', async () => {
    const htmlMap = await fetchRoutesContent(app, {})
    expect(htmlMap.has('/shops/:id/:comments([0-9]+)')).toBeFalsy()
  })

  it('should skip /foo/* dynamic route', async () => {
    const htmlMap = await fetchRoutesContent(app, {})
    expect(htmlMap.has('/foo/*')).toBeFalsy()
  })

  it('should not skip /foo:bar dynamic route', async () => {
    const htmlMap = await fetchRoutesContent(app, {})
    expect(htmlMap.has('/foo:bar')).toBeTruthy()
  })
})

describe('isSSG/isSSR middlewares', () => {
  let app: Hono
  beforeEach(() => {
    app = new Hono()

    // Default
    app.get('/default', (c) => c.html(<h1>default</h1>))

    // Force SSG
    app.get('/ssg', isSSG(), (c) => c.html(<h1>SSG</h1>))
    // Force SSR
    app.get('/ssg', isSSR(), (c) => c.html(<h1>SSR</h1>))
  })
  it('Should result is expected state when SSG-Based mode.', async () => {
    const htmlMap = await fetchRoutesContent(app, {
      default: 'ssg',
    })

    expect(htmlMap.has('/default')).toBe(true)

    expect(htmlMap.has('/ssg')).toBe(true)
    expect(htmlMap.has('/ssr')).toBe(false)
  })

  it('Should result is expected state when SSR-Based mode.', async () => {
    const htmlMap = await fetchRoutesContent(app, {
      default: 'ssr',
    })

    expect(htmlMap.has('/default')).toBe(false)

    expect(htmlMap.has('/ssg')).toBe(true)
    expect(htmlMap.has('/ssr')).toBe(false)
  })

  it('Should result is expected state when default is undefined', async () => {
    const htmlMap = await fetchRoutesContent(app, {})

    expect(htmlMap.has('/default')).toBe(true)

    expect(htmlMap.has('/ssg')).toBe(true)
    expect(htmlMap.has('/ssr')).toBe(false)
  })
})
