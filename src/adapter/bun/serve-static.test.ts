import { Hono } from '../..'
import { serveStatic } from './serve-static'

globalThis.Bun = {} as typeof Bun

describe('serveStatic()', () => {
  const fileMock = vi.fn((path: string) => {
    if (path.endsWith('missing.txt')) {
      return Object.assign('', {
        exists: async () => false,
      }) as unknown as ReturnType<typeof Bun.file>
    }

    return Object.assign(`Hello in ${path}`, {
      exists: async () => true,
    }) as unknown as ReturnType<typeof Bun.file>
  })

  beforeEach(() => {
    fileMock.mockClear()
    Bun = {
      file: fileMock,
    } as typeof Bun
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
