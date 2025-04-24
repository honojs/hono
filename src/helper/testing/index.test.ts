import { Hono } from '../../hono'
import { testClient } from '.'

describe('hono testClient', () => {
  it('GET Should return the correct search result', async () => {
    const app = new Hono().get('/search', (c) => c.json({ hello: 'world' }))
    const res = await testClient(app).search.$get()
    expect(await res.json()).toEqual({ hello: 'world' })
  })

  it('GET :id Should return the correct search result', async () => {
    const app = new Hono().get('/search/:id', (c) => c.json({ hello: 'world' + c.req.param('id') }))
    const res = await testClient(app).search[':id'].$get({
      param: { id: '1' },
    })
    expect(await res.json()).toEqual({ hello: 'world1' })
  })

  it('POST Should return the correct search result', async () => {
    const app = new Hono().post('/search', async (c) => {
      const data = await c.req.formData()
      return c.json({ hello: data.get('hello') })
    })
    const res = await testClient(app).search.$post({
      form: { hello: 'world' },
    })
    expect(await res.json()).toEqual({ hello: 'world' })
  })

  it('POST :id Should return the correct search result', async () => {
    const app = new Hono().post('/search/:id', async (c) => {
      const data = await c.req.formData()
      return c.json({ hello: data.get('hello') + c.req.param('id') })
    })
    const res = await testClient(app).search[':id'].$post({
      param: { id: '1' },
      form: { hello: 'world' },
    })
    expect(await res.json()).toEqual({ hello: 'world' + '1' })
  })

  it('Should return the correct environment variables value', async () => {
    type Bindings = { hello: string }
    const app = new Hono<{ Bindings: Bindings }>().get('/search', (c) => {
      return c.json({ hello: c.env.hello })
    })
    const res = await testClient(app, { hello: 'world' }).search.$get()
    expect(await res.json()).toEqual({ hello: 'world' })
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
