import { Hono } from '../..'
import type { MiddlewareHandler } from '../../types'
globalThis.Deno = {} as typeof Deno

describe('serveStatic()', () => {
  let serveStatic: (options?: Record<string, unknown>) => MiddlewareHandler
  const NotFound = class NotFound extends Error {}

  const openMock = vi.fn(async (path: string) => {
    if (path.endsWith('missing.txt')) {
      throw new NotFound()
    }
    return {
      readable: new Blob([`Hello in ${path}`]).stream(),
    }
  })

  const lstatMock = vi.fn(() => ({
    isDirectory: false,
  }))

  beforeEach(async () => {
    openMock.mockClear()
    lstatMock.mockClear()
    Deno = {
      open: openMock,
      lstatSync: lstatMock,
      errors: {
        NotFound,
      },
    } as typeof Deno

    ;({ serveStatic } = await import('./serve-static'))
  })

  it('Should serve file without options', async () => {
    const app = new Hono()
    app.use('/static/*', serveStatic())

    const res = await app.request('/static/hello.html')
    const text = await res.text()

    expect(res.status).toBe(200)
    expect(text).toContain('Hello in')
    expect(text).toContain('hello.html')
  })

  it('Should continue to next when file is missing', async () => {
    const app = new Hono()
    app.use('/static/*', serveStatic())
    app.get('/static/*', (c) => {
      return c.text('fallback')
    })

    const res = await app.request('/static/missing.txt')

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('fallback')
  })
})
