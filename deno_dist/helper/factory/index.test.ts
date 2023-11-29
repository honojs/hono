import { hc } from '../../client/index.ts'
import { Hono } from '../../index.ts'
import { createMiddleware } from './index.ts'

describe('createMiddleware', () => {
  type Env = { Variables: { foo: string } }
  const app = new Hono<Env>()

  const mw = (message: string) =>
    createMiddleware<Env>(async (c, next) => {
      c.set('foo', 'bar')
      await next()
      c.header('X-Message', message)
    })

  const route = app.get('/message', mw('Hello Middleware'), (c) => {
    return c.text(`Hey, ${c.var.foo}`)
  })

  it('Should return the correct header and the content', async () => {
    const res = await app.request('/message')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-message')).toBe('Hello Middleware')
    expect(await res.text()).toBe('Hey, bar')
  })

  it('Should provide the correct types', async () => {
    const client = hc<typeof route>('http://localhost')
    const url = client.message.$url()
    expect(url.pathname).toBe('/message')
  })
})
