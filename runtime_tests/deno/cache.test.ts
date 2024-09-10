import { Hono } from '../../src/hono.ts'
import { cache } from '../../src/middleware/cache/index.ts'
import { expect } from '@std/expect'
import { FakeTime } from '@std/testing/time'

Deno.test('Should return cached response', async () => {
  const c = await caches.open('my-app')
  await c.delete('http://localhost')

  let oneTimeWord = 'Hello Hono'

  const app = new Hono()
  app.use(
    '/',
    cache({
      cacheName: 'my-app',
      wait: true,
    })
  )
  app.get('/', (c) => {
    const result = oneTimeWord
    oneTimeWord = 'Not Found'
    return c.text(result)
  })

  await app.request('http://localhost')
  const res = await app.request('http://localhost')
  expect(await res.text()).toBe('Hello Hono')
  expect(res.headers.get('Hono-Cached-Time')).toBeNull()
  expect(res).not.toBeNull()
  expect(res.status).toBe(200)
})

Deno.test(
  {
    name: 'Should not return cached response over duration',
    sanitizeResources: false,
  },
  async () => {
    const time = new FakeTime()
    const c = await caches.open('my-app')
    await c.delete('http://localhost')

    let oneTimeWord = 'Hello Hono'

    const app = new Hono()
    app.use(
      '/',
      cache({
        cacheName: 'my-app',
        wait: true,
        duration: 60,
      })
    )
    app.get('/', (c) => {
      const result = oneTimeWord
      oneTimeWord = 'Not Found'
      return c.text(result)
    })

    await app.request('http://localhost')
    await time.tickAsync(60000)
    const res = await app.request('http://localhost')
    expect(await res.text()).toBe('Not Found')
    expect(res.headers.get('Hono-Cached-Time')).toBeNull()
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
  }
)
