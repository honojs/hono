import { Hono } from '../../src/hono.ts'
import { assertEquals } from './deps.ts'
import { stream, streamSSE } from '../../src/helper/streaming/index.ts'

Deno.test('Shuld call onAbort via stream', async () => {
  const app = new Hono()
  let aborted = false
  app.get('/stream', (c) => {
    return stream(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      return new Promise<void>((resolve) => {
        stream.onAbort(resolve)
      })
    })
  })

  const server = Deno.serve({ port: 0 }, app.fetch)
  const ac = new AbortController()
  const req = new Request(`http://localhost:${server.addr.port}/stream`, {
    signal: ac.signal,
  })
  assertEquals
  const res = fetch(req).catch(() => {})
  assertEquals(aborted, false)
  await new Promise((resolve) => setTimeout(resolve, 10))
  ac.abort()
  await res
  while (!aborted) {
    await new Promise((resolve) => setTimeout(resolve))
  }
  assertEquals(aborted, true)

  await server.shutdown()
})

Deno.test('Shuld call onAbort via streamSSE', async () => {
  const app = new Hono()
  let aborted = false
  app.get('/stream', (c) => {
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      return new Promise<void>((resolve) => {
        stream.onAbort(resolve)
      })
    })
  })

  const server = Deno.serve({ port: 0 }, app.fetch)
  const ac = new AbortController()
  const req = new Request(`http://localhost:${server.addr.port}/stream`, {
    signal: ac.signal,
  })
  assertEquals
  const res = fetch(req).catch(() => {})
  assertEquals(aborted, false)
  await new Promise((resolve) => setTimeout(resolve, 10))
  ac.abort()
  await res
  while (!aborted) {
    await new Promise((resolve) => setTimeout(resolve))
  }
  assertEquals(aborted, true)

  await server.shutdown()
})
