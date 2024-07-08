import { Hono } from '../../hono'
import { handle } from './handler'

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
