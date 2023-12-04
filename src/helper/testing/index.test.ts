import { Hono } from '../../hono'
import { testClient } from '.'

describe('hono testClinet', () => {
  it('should return the correct search result', async () => {
    const app = new Hono().get('/search', (c) => c.json({ hello: 'world' }))
    const res = await testClient(app).search.$get()
    expect(await res.json()).toEqual({ hello: 'world' })
  })

  it('should return the correct environment variables value', async () => {
    type Bindings = { hello: string }
    const app = new Hono<{ Bindings: Bindings }>().get('/search', (c) => {
      return c.json({ hello: c.env.hello })
    })
    const res = await testClient(app, { hello: 'world' }).search.$get()
    expect(await res.json()).toEqual({ hello: 'world' })
  })
})
