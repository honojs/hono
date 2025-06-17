import { describe, it, expect, beforeEach, vi } from 'vitest'
import path from 'node:path'
import type { ToSSGResult, FileSystemModule, ToSSGOptions, SSGPlugin } from '../ssg'
import { DEFAULT_OUTPUT_DIR } from '../ssg'
import { sitemapPlugin } from './sitemap'

const executeAfterGenerateHook = async (
  hook: SSGPlugin['afterGenerateHook'],
  result: ToSSGResult,
  fsModule: FileSystemModule,
  options?: ToSSGOptions
) => {
  if (Array.isArray(hook)) {
    for (const h of hook) {
      await h(result, fsModule, options)
    }
  } else if (hook) {
    await hook(result, fsModule, options)
  }
}

describe('Sitemap Plugin', () => {
  let mockResult: ToSSGResult
  let mockFsModule: FileSystemModule
  let writtenFiles: Record<string, string>

  beforeEach(() => {
    writtenFiles = {}
    mockResult = {
      success: true,
      files: [
        `${DEFAULT_OUTPUT_DIR}/index.html`,
        `${DEFAULT_OUTPUT_DIR}/about.html`,
        `${DEFAULT_OUTPUT_DIR}/blog/post-1.html`,
      ],
    }

    mockFsModule = {
      writeFile: vi.fn((path: string, data: string | Uint8Array) => {
        writtenFiles[path] = typeof data === 'string' ? data : data.toString()
        return Promise.resolve()
      }),
      mkdir: vi.fn(() => Promise.resolve()),
    }
  })

  it('should generate XML sitemap with all files', async () => {
    const plugin = sitemapPlugin({ baseURL: 'https://example.com' })

    await executeAfterGenerateHook(plugin.afterGenerateHook, mockResult, mockFsModule)

    const expectedPath = path.join(DEFAULT_OUTPUT_DIR, 'sitemap.xml')
    expect(mockFsModule.writeFile).toHaveBeenCalledWith(expectedPath, expect.any(String))

    const sitemapContent = writtenFiles[expectedPath]
    expect(sitemapContent).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(sitemapContent).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(sitemapContent).toContain(
      `<url><loc>https://example.com/${path.join(DEFAULT_OUTPUT_DIR, 'index.html')}</loc></url>`
    )
    expect(sitemapContent).toContain(
      `<url><loc>https://example.com/${path.join(DEFAULT_OUTPUT_DIR, 'about.html')}</loc></url>`
    )
    expect(sitemapContent).toContain('</urlset>')
  })

  it('should use custom output directory from options', async () => {
    const plugin = sitemapPlugin({ baseURL: 'https://example.com' })
    const options: ToSSGOptions = { dir: 'dist' }

    await executeAfterGenerateHook(plugin.afterGenerateHook, mockResult, mockFsModule, options)

    expect(mockFsModule.writeFile).toHaveBeenCalledWith('dist/sitemap.xml', expect.any(String))
  })

  it('should handle empty file list', async () => {
    const emptyResult: ToSSGResult = {
      success: true,
      files: [],
    }

    const plugin = sitemapPlugin({ baseURL: 'https://example.com' })

    await executeAfterGenerateHook(plugin.afterGenerateHook, emptyResult, mockFsModule)

    const expectedPath = path.join(DEFAULT_OUTPUT_DIR, 'sitemap.xml')
    const sitemapContent = writtenFiles[expectedPath]
    expect(sitemapContent).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(sitemapContent).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(sitemapContent).toContain('</urlset>')

    const urlMatches = sitemapContent.match(/<url>/g)
    expect(urlMatches).toBeNull()
  })

  it('should handle special characters in URLs', async () => {
    const specialResult: ToSSGResult = {
      success: true,
      files: [`${DEFAULT_OUTPUT_DIR}/hello world.html`, `${DEFAULT_OUTPUT_DIR}/こんにちは.html`],
    }

    const plugin = sitemapPlugin({ baseURL: 'https://example.com' })

    await executeAfterGenerateHook(plugin.afterGenerateHook, specialResult, mockFsModule)

    const expectedPath = path.join(DEFAULT_OUTPUT_DIR, 'sitemap.xml')
    const sitemapContent = writtenFiles[expectedPath]

    expect(sitemapContent).toContain('hello%20world.html')
    expect(sitemapContent).toContain('%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF.html')
  })

  it('should handle baseURL with subdirectory', async () => {
    const plugin = sitemapPlugin({ baseURL: 'https://example.com/blog' })

    await executeAfterGenerateHook(plugin.afterGenerateHook, mockResult, mockFsModule)

    const expectedPath = path.join(DEFAULT_OUTPUT_DIR, 'sitemap.xml')
    const sitemapContent = writtenFiles[expectedPath]

    expect(sitemapContent).toContain(
      `<url><loc>https://example.com/blog/${path.join(
        DEFAULT_OUTPUT_DIR,
        'index.html'
      )}</loc></url>`
    )
    expect(sitemapContent).toContain(
      `<url><loc>https://example.com/blog/${path.join(
        DEFAULT_OUTPUT_DIR,
        'about.html'
      )}</loc></url>`
    )
  })

  it('should handle baseURL with trailing slash', async () => {
    const plugin = sitemapPlugin({ baseURL: 'https://example.com/blog/' })
    await executeAfterGenerateHook(plugin.afterGenerateHook, mockResult, mockFsModule)

    const expectedPath = path.join(DEFAULT_OUTPUT_DIR, 'sitemap.xml')
    const sitemapContent = writtenFiles[expectedPath]

    expect(sitemapContent).toContain(
      `<url><loc>https://example.com/blog/${path.join(
        DEFAULT_OUTPUT_DIR,
        'index.html'
      )}</loc></url>`
    )
    expect(sitemapContent).toContain(
      `<url><loc>https://example.com/blog/${path.join(
        DEFAULT_OUTPUT_DIR,
        'about.html'
      )}</loc></url>`
    )
  })
})
