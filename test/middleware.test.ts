import { Hono } from '../src/hono'
import { Middleware } from '../src/middleware'

describe('Builtin Middleware', () => {
  const app = new Hono()

  app.use('*', Middleware.poweredBy())
  app.get('/', () => new Response('root'))

  it('Builtin Powered By Middleware', async () => {
    const req = new Request('http://localhost/')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Powered-By')).toBe('Hono')
  })
})

/*
TODO:
Content-Length middleware should not be as default...

describe('Default Middleware', () => {
  const app = new Hono()
  app.get('/text', (c) => c.text('abcdefg'))
  app.get('/japanese', (c) => c.text('炎'))

  it('Content-Length', async () => {
    let req = new Request('http://localhost/text')
    let res = await app.dispatch(req)
    expect(res.headers.get('Content-Length')).toBe('7')
    req = new Request('http://localhost/japanese')
    res = await app.dispatch(req)
    expect(res.headers.get('Content-Length')).toBe('3')
  })
})
*/
