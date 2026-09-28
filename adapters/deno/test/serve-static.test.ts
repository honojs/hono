import { Hono } from 'hono'
import { serveStatic } from '../src/index.ts'
import { assertEquals, assertMatch } from './assert.ts'

Deno.test('Serve Static middleware', async () => {
  const app = new Hono()
  let notFoundCalls = 0
  const onNotFound = () => {
    notFoundCalls++
  }
  app.all('/favicon.ico', serveStatic({ path: './test/favicon.ico' }))
  app.all('/favicon-notfound.ico', serveStatic({ path: './test/favicon-notfound.ico', onNotFound }))
  app.use('/favicon-notfound.ico', async (c, next) => {
    await next()
    c.header('X-Custom', 'Deno')
  })

  app.get(
    '/static/*',
    serveStatic({
      root: './test',
      onNotFound,
    })
  )

  app.get(
    '/dot-static/*',
    serveStatic({
      root: './test',
      rewriteRequestPath: (path) => path.replace(/^\/dot-static/, './.static'),
    })
  )

  app.get('/static-absolute-root/*', serveStatic({ root: new URL('.', import.meta.url).pathname }))

  let res = await app.request('http://localhost/favicon.ico')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'image/x-icon')
  await res.body?.cancel()

  res = await app.request('http://localhost/favicon-notfound.ico')
  assertEquals(res.status, 404)
  assertMatch(res.headers.get('Content-Type') || '', /^text\/plain/)
  assertEquals(res.headers.get('X-Custom'), 'Deno')
  assertEquals(notFoundCalls, 1)

  res = await app.request('http://localhost/static/plain.txt')
  assertEquals(res.status, 200)
  assertMatch(await res.text(), /^Deno!(\r?\n)?$/)

  res = await app.request('http://localhost/static/download')
  assertEquals(res.status, 200)
  assertMatch(await res.text(), /^download(\r?\n)?$/)

  res = await app.request('http://localhost/dot-static/plain.txt')
  assertEquals(res.status, 200)
  assertMatch(await res.text(), /^Deno!!(\r?\n)?$/)
  assertEquals(notFoundCalls, 1)

  res = await app.fetch({
    method: 'GET',
    url: 'http://localhost/static/%2e%2e/static/plain.txt',
  } as Request)
  assertEquals(res.status, 404)
  assertEquals(await res.text(), '404 Not Found')

  res = await app.request('http://localhost/static/helloworld')
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'Hi\n')

  res = await app.request('http://localhost/static/hello.world')
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'Hi\n')

  res = await app.request('http://localhost/static-absolute-root/plain.txt')
  assertEquals(res.status, 200)
  assertMatch(await res.text(), /^Deno!(\r?\n)?$/)

  res = await app.request('http://localhost/static')
  assertEquals(res.status, 404)
  assertEquals(await res.text(), '404 Not Found')

  res = await app.request('http://localhost/static/dir')
  assertEquals(res.status, 404)
  assertEquals(await res.text(), '404 Not Found')

  res = await app.request('http://localhost/static/helloworld/nested')
  assertEquals(res.status, 404)
  assertEquals(await res.text(), '404 Not Found')

  res = await app.request('http://localhost/static/helloworld/../')
  assertEquals(res.status, 404)
  assertEquals(await res.text(), '404 Not Found')
})
