import { Hono } from '../../hono'
import { testClient, bufferResponse } from '.'

describe('hono testClient', () => {
  it('Should return the correct search result', async () => {
    const app = new Hono().get('/search', (c) => c.json({ hello: 'world' }))
    const res = await testClient(app).search.$get()
    expect(await res.json()).toEqual({ hello: 'world' })
  })

  it('Should return the correct environment variables value', async () => {
    type Bindings = { hello: string }
    const app = new Hono<{ Bindings: Bindings }>().get('/search', (c) => {
      return c.json({ hello: c.env.hello })
    })
    const res = await testClient(app, { hello: 'world' }).search.$get()
    expect(await res.json()).toEqual({ hello: 'world' })
  })

  it('Should use the passed in headers', async () => {
    const app = new Hono().get('/search', (c) => {
      return c.json({ query: c.req.header('x-query') })
    })
    const res = await testClient(app, undefined, undefined, {
      headers: { 'x-query': 'abc' },
    }).search.$get()
    expect(await res.json()).toEqual({ query: 'abc' })
  })

  it('Should return a correct URL with out throwing an error', async () => {
    const app = new Hono().get('/abc', (c) => c.json(0))
    const url = testClient(app).abc.$url()
    expect(url.pathname).toBe('/abc')
  })

  it('Should not throw an error with $ws()', async () => {
    vi.stubGlobal('WebSocket', class {})
    const app = new Hono().get('/ws', (c) => c.text('Fake response of a WebSocket'))
    // @ts-expect-error $ws is not typed correctly
    expect(() => testClient(app).ws.$ws()).not.toThrowError()
  })
})

describe('bufferResponse', () => {
  it('Should buffer text response body', async () => {
    const app = new Hono().get('/text', (c) => c.text('hello'))
    const res = await bufferResponse(app.request('/text'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })

  it('Should buffer json response body', async () => {
    const app = new Hono().get('/json', (c) => c.json({ message: 'ok' }))
    const res = await bufferResponse(app.request('/json'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ message: 'ok' })
  })

  it('Should preserve status and headers', async () => {
    const app = new Hono().get('/custom', (c) => {
      c.header('X-Custom', 'test')
      return c.text('created', 201)
    })
    const res = await bufferResponse(app.request('/custom'))
    expect(res.status).toBe(201)
    expect(res.headers.get('X-Custom')).toBe('test')
  })

  it('Should handle response with no body', async () => {
    const app = new Hono().get('/empty', (c) => c.body(null, 204))
    const res = await bufferResponse(app.request('/empty'))
    expect(res.status).toBe(204)
  })

  it('Should accept a plain Response (non-Promise)', async () => {
    const res = await bufferResponse(new Response('direct'))
    expect(await res.text()).toBe('direct')
  })
})
