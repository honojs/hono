import { Hono } from '../../hono'
import { handle } from './handler'

type Env = {
  Bindings: {
    TOKEN: string
  }
}

describe('Adapter for Cloudflare Pages', () => {
  it('Should return 200 response', async () => {
    const request = new Request('http://localhost/api/foo')
    const env = {
      TOKEN: 'HONOISCOOL',
    }
    const app = new Hono<Env>()
    app.get('/api/foo', (c) => {
      return c.text(c.env.TOKEN)
    })
    const handler = handle(app)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request, env })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('HONOISCOOL')
  })

  it('Should return 200 response with path', async () => {
    const request = new Request('http://localhost/api/foo')
    const app = new Hono()
    app.get('/foo', (c) => {
      return c.text('/api/foo')
    })
    const handler = handle('/api', app)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/api/foo')
  })
})
