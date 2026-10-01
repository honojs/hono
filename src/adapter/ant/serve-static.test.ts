import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from '../../hono'
import { serveStatic } from './serve-static'

describe('ServeStatic Middleware', () => {
  let root: string
  const app = new Hono()
  const onNotFound = vi.fn(() => {})
  const onFound = vi.fn(() => {})

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'hono-ant-static-'))
    await mkdir(join(root, 'static', 'top'), { recursive: true })
    await mkdir(join(root, '.static'), { recursive: true })
    await writeFile(join(root, 'static', 'plain.txt'), 'This is plain.txt')
    await writeFile(join(root, 'static', 'hono.html'), '<h1>Hono!</h1>')
    await writeFile(join(root, 'static', 'top', 'index.html'), '<h1>Top</h1>')
    await writeFile(join(root, '.static', 'plain.txt'), 'In the dot')

    app.use('/static/*', serveStatic({ root, onNotFound, onFound }))
    app.use(
      '/dot-static/*',
      serveStatic({
        root,
        rewriteRequestPath: (path) => path.replace(/^\/dot-static/, '/.static'),
      })
    )
  })

  afterAll(async () => {
    await rm(root, { recursive: true, force: true })
  })

  beforeEach(() => {
    onNotFound.mockClear()
    onFound.mockClear()
  })

  it('Should return plain.txt', async () => {
    const res = await app.request('http://localhost/static/plain.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('This is plain.txt')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(onFound).toHaveBeenCalledWith(join(root, 'static', 'plain.txt'), expect.anything())
    expect(onNotFound).not.toHaveBeenCalled()
  })

  it('Should return hono.html', async () => {
    const res = await app.request('http://localhost/static/hono.html')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>Hono!</h1>')
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('Should return index.html for a directory', async () => {
    const res = await app.request('http://localhost/static/top')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>Top</h1>')
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('Should return 404 response', async () => {
    const res = await app.request('http://localhost/static/not-found.html')
    expect(res.status).toBe(404)
    expect(onNotFound).toHaveBeenCalledWith(
      join(root, 'static', 'not-found.html'),
      expect.anything()
    )
  })

  it('Should return file with rewriteRequestPath', async () => {
    const res = await app.request('http://localhost/dot-static/plain.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('In the dot')
  })
})
