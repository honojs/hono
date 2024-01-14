import { describe, it, expect } from 'vitest'
import { Hono } from '../../hono'
import { jsx } from '../../jsx'
import { generateHtmlMap, saveHtmlToLocal, toSSG } from './index'
import type { FileSystemModule } from './index'

describe('toSSG function', () => {
  it('Should correctly generate static HTML files for Hono routes', async () => {
    const app = new Hono()
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

    const fsMock = {
      writeFile: vi.fn((path, data) => Promise.resolve()),
      mkdir: vi.fn((path, options) => Promise.resolve()),
    }

    const htmlMap = await generateHtmlMap(app)
    const files = await saveHtmlToLocal(htmlMap, fsMock, './static')

    expect(files.length).toBeGreaterThan(0)
    expect(fsMock.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true })
    expect(fsMock.writeFile).toHaveBeenCalled()
  })

  it('Should handle errors correctly', async () => {
    const app = new Hono()
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

    const fsMock = {
      writeFile: vi.fn((path, data) => Promise.reject(new Error('Write error'))),
      mkdir: vi.fn((path, options) => Promise.resolve()),
    }

    try {
      const htmlMap = await generateHtmlMap(app)
      await saveHtmlToLocal(htmlMap, fsMock, './static')
      expect(true).toBe(false) // Should not reach here
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe('Write error')
      } else {
        expect(true).toBe(false) // Fail the test if it's not an Error instance
      }
    }
  })
})

describe('toSSG function', () => {
  it('Should correctly generate static HTML files for Hono routes', async () => {
    const app = new Hono()
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

    const fsMock: FileSystemModule = {
      writeFile: vi.fn((path, data) => {
        console.log(`writeFile called with path: ${path}, data: ${data}`)
        return Promise.resolve()
      }),
      mkdir: vi.fn((path, options) => {
        console.log(`mkdir called with path: ${path}, options: ${JSON.stringify(options)}`)
        return Promise.resolve()
      }),
    }

    const result = await toSSG(app, fsMock, { dir: './static' })

    expect(result.success).toBe(true)
    expect(result.files).toBeDefined()
    expect(result.files?.length).toBeGreaterThan(0) // creating file
    expect(fsMock.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true })
    expect(fsMock.writeFile).toHaveBeenCalled()
  })

  it('Should handle errors correctly', async () => {
    const app = new Hono()
    app.get('/', (c) => c.text('Hello, World!'))
    app.get('/about', (c) => c.text('About Page'))

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
