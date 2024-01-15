import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from '../../hono'
import { jsx } from '../../jsx'
import { fetchRoutesContent, saveContentToFiles, toSSG } from './index'
import type { FileSystemModule } from './index'

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
    
    const htmlMap = await fetchRoutesContent(app);
    const files = await saveContentToFiles(htmlMap, fsMock, './static');
    
    expect(files.length).toBeGreaterThan(0);
    expect(fsMock.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(fsMock.writeFile).toHaveBeenCalled();
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
