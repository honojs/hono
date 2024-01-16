import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from '../../hono'
import { jsx } from '../../jsx'
import { fetchRoutesContent, saveContentToFiles, toSSG } from './index'
import type { FileSystemModule } from './index'
import { poweredBy } from '../../middleware/powered-by'

describe('toSSG function', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.get('/', (c) => c.text('Hello, World!'))
    app.get('/about', (c) => c.text('About Page'))
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
  })

  it('Should correctly generate static HTML files for Hono routes', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn((path, data) => Promise.resolve()),
      mkdir: vi.fn((path, options) => Promise.resolve()),
    }
    
    const htmlMap = await fetchRoutesContent(app)
    const files = await saveContentToFiles(htmlMap, fsMock, './static')
    
    expect(files.length).toBeGreaterThan(0)
    expect(fsMock.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true })
    expect(fsMock.writeFile).toHaveBeenCalled()
  })

  it('Should handle file system errors correctly in saveContentToFiles', async () => {
    const fsMock: FileSystemModule = {
      writeFile: vi.fn((path, data) => Promise.reject(new Error('Write error'))),
      mkdir: vi.fn((path, options) => Promise.resolve()),
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
      writeFile: vi.fn((path, data) => Promise.reject(new Error('Write error'))),
      mkdir: vi.fn((path, options) => Promise.resolve()),
    }

    const result = await toSSG(app, fsMock, { dir: './static' })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.files).toBeUndefined()
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
    expect(htmlMap.get('/text')).toEqual({ content: 'Text Response', mimeType: 'text/plain' })
    expect(htmlMap.get('/html')).toEqual({ content: '<p>HTML Response</p>', mimeType: 'text/html' })
    expect(htmlMap.get('/json')).toEqual({ content: '{"message":"JSON Response"}', mimeType: 'application/json' })
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
  let htmlMap: Map<string, { content: string | ArrayBuffer, mimeType: string }>

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
      writeFile: vi.fn((path, data) => Promise.resolve()),
      mkdir: vi.fn((path, options) => Promise.reject(new Error('File write error'))),
    }
    
    await expect(saveContentToFiles(htmlMap, fsMock, './static')).rejects.toThrow('File write error')
  })
    
})

describe('Dynamic route handling', () => {
  let app: Hono
  beforeEach(() => {
    app = new Hono()
    app.get('/shops/:id', (c) => c.html('Shop Page'))
    app.get('/shops/:id/:comments([0-9]+)', (c) => c.html('Comments Page'))
    app.get('/foo/*', (c) => c.html('Foo Page'))
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
})
