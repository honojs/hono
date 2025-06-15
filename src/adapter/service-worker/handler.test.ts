import { Hono } from '../../hono'
import { handle } from './handler'
import type { FetchEvent } from './types'

beforeAll(() => {
  // fetch errors when it's not bound to globalThis in service worker
  // set a fetch stub to emulate that behavior
  vi.stubGlobal(
    'fetch',
    function fetch(this: undefined | typeof globalThis, arg0: string | Request) {
      if (this !== globalThis) {
        const error = new Error(
          "Failed to execute 'fetch' on 'WorkerGlobalScope': Illegal invocation"
        )
        error.name = 'TypeError'
        throw error
      }
      if (arg0 instanceof Request && arg0.url === 'http://localhost/fallback') {
        return new Response('hello world')
      }
      return Response.error()
    }
  )
})
afterAll(() => {
  vi.unstubAllGlobals()
})

describe('handle', () => {
  it('Success to fetch', async () => {
    const app = new Hono()
    app.get('/', (c) => {
      return c.json({ hello: 'world' })
    })
    const handler = handle(app)
    const json = await new Promise<Response>((resolve) => {
      handler({
        request: new Request('http://localhost/'),
        respondWith(res) {
          resolve(res)
        },
      } as FetchEvent)
    }).then((res) => res.json())
    expect(json).toStrictEqual({ hello: 'world' })
  })
  it('Fallback 404', async () => {
    const app = new Hono()
    const handler = handle(app)
    const text = await new Promise<Response>((resolve) => {
      handler({
        request: new Request('http://localhost/fallback'),
        respondWith(res) {
          resolve(res)
        },
      } as FetchEvent)
    }).then((res) => res.text())
    expect(text).toBe('hello world')
  })
  it('Fallback 404 with explicit fetch', async () => {
    const app = new Hono()
    const handler = handle(app, {
      async fetch() {
        return new Response('hello world')
      },
    })
    const text = await new Promise<Response>((resolve) => {
      handler({
        request: new Request('http://localhost/'),
        respondWith(res) {
          resolve(res)
        },
      } as FetchEvent)
    }).then((res) => res.text())
    expect(text).toBe('hello world')
  })
  it('Do not fallback 404 when fetch is undefined', async () => {
    const app = new Hono()
    app.get('/', (c) => c.text('Not found', 404))
    const handler = handle(app, {
      fetch: undefined,
    })
    const result = await new Promise<Response>((resolve) =>
      handler({
        request: new Request('https://localhost/'),
        respondWith(r) {
          resolve(r)
        },
      } as FetchEvent)
    )

    expect(result.status).toBe(404)
    expect(await result.text()).toBe('Not found')
  })
})
