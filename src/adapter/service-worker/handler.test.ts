import { Hono } from '../../hono'
import type { FetchEventLike } from '../../types'
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
      } as FetchEventLike)
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
      } as FetchEventLike)
    }).then((res) => res.text())
    expect(text).toBe('hello world')
  })
  it('Fallback 404 when app does not response Promise', async () => {
    const app = new Hono()
    app.get('/', c => c.text('Not found', 404))
    const handler = handle(app)
    const result = handler({
      request: new Request('https://localhost/')
    } as FetchEventLike)

    expect(result).toBeUndefined()
  })
})
