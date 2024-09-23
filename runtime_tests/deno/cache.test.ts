import { expect } from '@std/expect'
import { FakeTime } from '@std/testing/time'
import { Hono } from '../../src/hono.ts'
import { cache } from '../../src/middleware/cache/index.ts'

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
  expect(res.headers.get('Hono-Cache-Expires')).toBeNull()
  expect(res).not.toBeNull()
  expect(res.status).toBe(200)
  await c.delete('http://localhost')
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
    let res = await app.request('http://localhost')

    await time.tickAsync(59999)

    expect(await res.text()).toBe('Hello Hono')
    expect(res.headers.get('Hono-Cache-Expires')).toBeNull()
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)

    await time.tickAsync(1)

    res = await app.request('http://localhost')
    expect(await res.text()).toBe('Not Found')
    expect(res.headers.get('Hono-Cache-Expires')).toBeNull()
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    await c.delete('http://localhost')
  }
)

Deno.test(
  {
    name: 'Should return cached response if the response is immutable',
    sanitizeResources: false,
  },
  async () => {
    const c = await caches.open('my-app')
    await c.delete('http://localhost')

    let oneTime = true
    let oneTimeWord = 'Hello Hono'

    const example = new Hono()
    example.get('/', (c) => {
      const result = oneTimeWord
      oneTimeWord = 'Not Found'
      return c.text(result)
    })

    const app = new Hono()
    app.use(
      '/',
      cache({
        cacheName: 'my-app',
        wait: true,
      })
    )
    app.get('/', async (c) => {
      const result = oneTime ? await fetch(`http://localhost:${server.addr.port}`) : 'Not Found'
      oneTime = false
      if (result instanceof Response) {
        return result
      } else {
        return c.text('Not Found')
      }
    })

    const server = Deno.serve({ port: 0 }, example.fetch)

    await app.request('http://localhost')
    const res = await app.request('http://localhost')
    expect(await res.text()).toBe('Hello Hono')
    expect(res.headers.get('Hono-Cache-Expires')).toBeNull()
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)

    await server.shutdown()
    await c.delete('http://localhost')
  }
)
