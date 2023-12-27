import { Hono } from '../../hono'
import { handle } from './handler'

describe('Adapter for Sveltekit', () => {
  it('Should return 200 response', async () => {
    const app = new Hono()
    app.get('/api/foo', (c) => {
      return c.text('/api/foo')
    })
    const handler = handle(app)
    const request = new Request('http://localhost/api/foo')
    const res = await handler({ request })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/api/foo')
  })

  it('Should not use `route()` if path argument is not passed', async () => {
    const app = new Hono().basePath('/api')

    app.onError((e) => {
      throw e
    })
    app.get('/error', () => {
      throw new Error('Custom Error')
    })

    const handler = handle(app)
    const request = new Request('http://localhost/api/error')
    expect(() => handler({ request })).toThrowError('Custom Error')
  })
})
