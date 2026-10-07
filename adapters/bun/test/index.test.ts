import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Hono } from 'hono'
import type { WSMessageReceive } from 'hono/ws'
import { createBunWebSocket, serveStatic, toSSG } from '../src/index'
import type { BunWebSocketData } from '../src/index'

describe('serveStatic', () => {
  const app = new Hono()
  const onNotFound = mock(() => {})
  app.all('/favicon.ico', serveStatic({ path: './test/favicon.ico' }))
  app.all('/favicon-notfound.ico', serveStatic({ path: './test/favicon-notfound.ico', onNotFound }))
  app.use('/favicon-notfound.ico', async (c, next) => {
    await next()
    c.header('X-Custom', 'Bun')
  })
  app.get(
    '/static/*',
    serveStatic({
      root: './test/',
      onNotFound,
    })
  )
  app.get(
    '/dot-static/*',
    serveStatic({
      root: './test/',
      rewriteRequestPath: (path) => path.replace(/^\/dot-static/, './.static'),
    })
  )
  app.all('/static-absolute-root/*', serveStatic({ root: path.dirname(__filename) }))

  beforeEach(() => onNotFound.mockClear())

  it('Should return static file correctly', async () => {
    const res = await app.request(new Request('http://localhost/favicon.ico'))
    await res.arrayBuffer()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/x-icon')
  })

  it('Should return 404 response', async () => {
    const res = await app.request(new Request('http://localhost/favicon-notfound.ico'))
    expect(res.status).toBe(404)
    expect(res.headers.get('X-Custom')).toBe('Bun')
    expect(onNotFound).toHaveBeenCalledWith(
      process.platform === 'win32' ? 'test\\favicon-notfound.ico' : 'test/favicon-notfound.ico',
      expect.anything()
    )
  })

  it('Should return 200 response - /static/plain.txt', async () => {
    const res = await app.request(new Request('http://localhost/static/plain.txt'))
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^Bun!(\r?\n)?$/)
    expect(onNotFound).not.toHaveBeenCalled()
  })

  it('Should return 200 response - /static/download', async () => {
    const res = await app.request(new Request('http://localhost/static/download'))
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^download(\r?\n)?$/)
    expect(onNotFound).not.toHaveBeenCalled()
  })

  it('Should return 200 response - /dot-static/plain.txt', async () => {
    const res = await app.request(new Request('http://localhost/dot-static/plain.txt'))
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^Bun!!(\r?\n)?$/)
  })

  it('Should return 200 response - /static/helloworld', async () => {
    const res = await app.request('http://localhost/static/helloworld')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/Hi\r?\n/)
  })

  it('Should return 200 response - /static/hello.world', async () => {
    const res = await app.request('http://localhost/static/hello.world')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/Hi\r?\n/)
  })

  it('Should return 200 response - /static-absolute-root/plain.txt', async () => {
    const res = await app.request('http://localhost/static-absolute-root/plain.txt')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^Bun!(\r?\n)?$/)
    expect(onNotFound).not.toHaveBeenCalled()
  })
})

describe('toSSG', () => {
  const dir = './test/.ssg-output'

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('Should generate static files for the routes', async () => {
    const app = new Hono()
    app.get('/', (c) => c.text('Hello, World!'))
    app.get('/about', (c) => c.text('About Page'))
    app.get('/about/some', (c) => c.text('About Page 2tier'))
    app.post('/about/some/thing', (c) => c.text('About Page 3tier'))
    app.get('/bravo', (c) => c.html('Bravo Page'))

    const result = await toSSG(app, { dir })
    expect(result.success).toBeTruthy()
    expect(result.error).toBeUndefined()
    expect(result.files).toBeDefined()
    expect(await fs.readFile(path.join(dir, 'index.txt'), 'utf8')).toBe('Hello, World!')
  })
})

describe('createBunWebSocket', () => {
  const app = new Hono()
  const { websocket, upgradeWebSocket } = createBunWebSocket()

  it('Should deliver messages to the handler', async () => {
    const receivedMessagePromise = new Promise<WSMessageReceive>((resolve) =>
      app.get(
        '/ws',
        upgradeWebSocket(() => ({
          onMessage(evt) {
            resolve(evt.data)
          },
        }))
      )
    )
    const upgradedData = await new Promise<BunWebSocketData>((resolve) =>
      app.fetch(new Request('http://localhost/ws'), {
        upgrade: (_req: Request, data: { data: BunWebSocketData }) => {
          resolve(data.data)
        },
      })
    )
    const message = Math.random().toString()
    websocket.message(
      {
        close: () => undefined,
        readyState: 3,
        data: upgradedData,
        send: () => undefined,
      },
      message
    )
    expect(await receivedMessagePromise).toBe(message)
  })
})
