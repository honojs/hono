import { Hono } from '../../hono'
import * as plugins from './plugins'
import { toSSG } from './ssg'
import type { FileSystemModule } from './ssg'

const { defaultPlugin, redirectPlugin } = plugins

describe('Built-in SSG plugins', () => {
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

  describe('default plugin', () => {
    it('uses defaultPlugin when plugins option is omitted', async () => {
      const defaultPluginSpy = vi.spyOn(plugins, 'defaultPlugin')
      await toSSG(app, fsMock, { dir: './static' })
      expect(defaultPluginSpy).toHaveBeenCalled()
      defaultPluginSpy.mockRestore()
    })

    it('skips non-200 responses with defaultPlugin', async () => {
      const result = await toSSG(app, fsMock, { plugins: [defaultPlugin()], dir: './static' })
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
  })

  describe('redirect plugin', () => {
    it('generates redirect HTML for 301/302 responses using redirectPlugin', async () => {
      const writtenFiles: Record<string, string> = {}
      const fsMockLocal: FileSystemModule = {
        writeFile: (path, data) => {
          writtenFiles[path] = typeof data === 'string' ? data : data.toString()
          return Promise.resolve()
        },
        mkdir: vi.fn(() => Promise.resolve()),
      }
      const redirectApp = new Hono()
      redirectApp.get('/old', (c) => c.redirect('/new'))
      redirectApp.get('/new', (c) => c.html('New Page'))

      await toSSG(redirectApp, fsMockLocal, { dir: './static', plugins: [redirectPlugin()] })

      expect(writtenFiles['static/old.html']).toBeDefined()
      const content = writtenFiles['static/old.html']
      // Should contain meta refresh
      expect(content).toContain('meta http-equiv="refresh" content="0;url=/new"')
      // Should contain canonical
      expect(content).toContain('rel="canonical" href="/new"')
      // Should contain robots noindex
      expect(content).toContain('<meta name="robots" content="noindex" />')
      // Should contain link anchor
      expect(content).toContain('<a href="/new">Redirecting to <code>/new</code></a>')
      // Should contain a body element that includes the anchor
      expect(content).toMatch(/<body[^>]*>[\s\S]*<a href=\"\/new\">[\s\S]*<\/body>/)
    })

    it('escapes Location header values when generating redirect HTML', async () => {
      const writtenFiles: Record<string, string> = {}
      const fsMockLocal: FileSystemModule = {
        writeFile: (path, data) => {
          writtenFiles[path] = typeof data === 'string' ? data : data.toString()
          return Promise.resolve()
        },
        mkdir: vi.fn(() => Promise.resolve()),
      }

      const maliciousLocation = '/new"> <script>alert(1)</script>'
      const redirectApp = new Hono()
      redirectApp.get(
        '/evil',
        (c) => new Response(null, { status: 301, headers: { Location: maliciousLocation } })
      )

      await toSSG(redirectApp, fsMockLocal, { dir: './static', plugins: [redirectPlugin()] })

      const content = writtenFiles['static/evil.html']
      expect(content).toBeDefined()
      expect(content).not.toContain('<script>alert(1)</script>')
      expect(content).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(content).toContain('&quot;')
    })

    it('skips generating a redirect HTML when 301/302 has no Location header', async () => {
      const writtenFiles: Record<string, string> = {}
      const fsMockLocal: FileSystemModule = {
        writeFile: (path, data) => {
          writtenFiles[path] = typeof data === 'string' ? data : data.toString()
          return Promise.resolve()
        },
        mkdir: vi.fn(() => Promise.resolve()),
      }
      const redirectApp = new Hono()
      // Return a 301 without Location header
      redirectApp.get('/bad', (c) => new Response(null, { status: 301 }))

      await toSSG(redirectApp, fsMockLocal, { dir: './static', plugins: [redirectPlugin()] })

      expect(writtenFiles['static/bad.html']).toBeUndefined()
    })

    it('redirectPlugin before defaultPlugin generates redirect HTML', async () => {
      const writtenFiles: Record<string, string> = {}
      const fsMockLocal: FileSystemModule = {
        writeFile: (path, data) => {
          writtenFiles[path] = typeof data === 'string' ? data : data.toString()
          return Promise.resolve()
        },
        mkdir: vi.fn(() => Promise.resolve()),
      }

      const redirectApp = new Hono()
      redirectApp.get('/old', (c) => c.redirect('/new'))
      redirectApp.get('/new', (c) => c.html('New Page'))

      await toSSG(redirectApp, fsMockLocal, {
        dir: './static',
        plugins: [redirectPlugin(), defaultPlugin()],
      })
      expect(writtenFiles['static/old.html']).toBeDefined()
    })

    it('redirectPlugin after defaultPlugin does not generate redirect HTML', async () => {
      const writtenFiles: Record<string, string> = {}
      const fsMockLocal: FileSystemModule = {
        writeFile: (path, data) => {
          writtenFiles[path] = typeof data === 'string' ? data : data.toString()
          return Promise.resolve()
        },
        mkdir: vi.fn(() => Promise.resolve()),
      }

      const redirectApp = new Hono()
      redirectApp.get('/old', (c) => c.redirect('/new'))
      redirectApp.get('/new', (c) => c.html('New Page'))

      await toSSG(redirectApp, fsMockLocal, {
        dir: './static',
        plugins: [defaultPlugin(), redirectPlugin()],
      })
      expect(writtenFiles['static/old.html']).toBeUndefined()
    })
  })
})
