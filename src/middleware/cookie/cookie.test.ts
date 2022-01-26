/* eslint-disable quotes */
import { Hono } from '../../hono'
import { Middleware } from '../../middleware'

describe('Cookie Middleware', () => {
  const app = new Hono()
  app.use('/cookie', Middleware.cookie())

  app.get('/cookie', (c) => {
    const yummyCookie = c.req.cookie('yummy_cookie')
    const tastyCookie = c.req.cookie('tasty_cookie')
    const res = new Response('Good cookie')
    res.headers.set('Yummy-Cookie', yummyCookie)
    res.headers.set('Tasty-Cookie', tastyCookie)
    return res
  })

  it('Parse cookie on c.req.cookie', async () => {
    const req = new Request('http://localhost/cookie')
    const cookieString = 'yummy_cookie=choco; tasty_cookie = strawberry '
    req.headers.set('Cookie', cookieString)
    const res = await app.dispatch(req)

    expect(res.headers.get('Yummy-Cookie')).toBe('choco')
    expect(res.headers.get('Tasty-Cookie')).toBe('strawberry')
  })

  app.use('/set-cookie', Middleware.cookie())

  app.get('/set-cookie', (c) => {
    c.cookie('delicious_cookie', 'macha')
    return c.text('Give cookie')
  })

  it('Set cookie on c.cookie', async () => {
    const req = new Request('http://localhost/set-cookie')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    const header = res.headers.get('Set-Cookie')
    expect(header).toBe('delicious_cookie=macha')
  })

  app.use('/set-cookie-complex', Middleware.cookie())

  app.get('/set-cookie-complex', (c) => {
    c.cookie('greate_cookie', 'banana', {
      path: '/',
      secure: true,
      domain: 'example.com',
      httpOnly: true,
      maxAge: 1000,
      expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
      sameSite: 'Strict',
    })
    return c.text('Give cookie')
  })

  it('Complex pattern', async () => {
    const req = new Request('http://localhost/set-cookie-complex')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    const header = res.headers.get('Set-Cookie')
    expect(header).toBe(
      'greate_cookie=banana; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSaite=Strict'
    )
  })
})
