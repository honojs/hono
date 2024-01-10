import { Hono } from '../../hono'
import type { EventContext } from './handler'
import { handle } from './handler'

type Env = {
  Bindings: {
    TOKEN: string
    eventContext: EventContext
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
      const reqInEventContext = c.env.eventContext.request
      return c.json({ TOKEN: c.env.TOKEN, requestURL: reqInEventContext.url })
    })
    const handler = handle(app)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await handler({ request, env })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      TOKEN: 'HONOISCOOL',
      requestURL: 'http://localhost/api/foo',
    })
  })

  it('Should not use `basePath()` if path argument is not passed', async () => {
    const request = new Request('http://localhost/api/error')
    const app = new Hono().basePath('/api')

    app.onError((e) => {
      throw e
    })
    app.get('/error', () => {
      throw new Error('Custom Error')
    })

    const handler = handle(app)
    // It does throw the error if app is NOT "subApp"
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => handler({ request })).toThrowError('Custom Error')
  })
})
