import { Hono } from '../../hono'
import { hc } from '.'

describe('hono testClinet', () => {
  it('should return the correct search result', async () => {
    const app = new Hono().get('/search', (c) => c.jsonT({ hello: 'world' }))
    const res = await hc(app).search.$get()
    expect(await res.json()).toEqual({ hello: 'world' })
  })

  it('should return the correct environment variables value', async () => {
    type Bindings = { hello: string }
    const app = new Hono<{ Bindings: Bindings }>().get('/search', (c) => {
      return c.jsonT({ hello: c.env.hello })
    })
    const res = await hc(app, { hello: 'world' }).search.$get()
    expect(await res.json()).toEqual({ hello: 'world' })
  })
})
