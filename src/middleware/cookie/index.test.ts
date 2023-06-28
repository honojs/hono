import { Hono } from '../../hono'
import { getCookie, setCookie, deleteCookie } from '.'

describe('Cookie Middleware', () => {
  describe('Parse cookie', () => {
    const apps: Record<string, Hono> = {}
    apps['get by name'] = (() => {
      const app = new Hono()

      app.get('/cookie', (c) => {
        const yummyCookie = getCookie(c, 'yummy_cookie')
        const tastyCookie = getCookie(c, 'tasty_cookie')
        const res = new Response('Good cookie')
        if (yummyCookie && tastyCookie) {
          res.headers.set('Yummy-Cookie', yummyCookie)
          res.headers.set('Tasty-Cookie', tastyCookie)
        }
        return res
      })

      return app
    })()

    apps['get all as an object'] = (() => {
      const app = new Hono()

      app.get('/cookie', (c) => {
        const { yummy_cookie: yummyCookie, tasty_cookie: tastyCookie } = getCookie(c)
        const res = new Response('Good cookie')
        res.headers.set('Yummy-Cookie', yummyCookie)
        res.headers.set('Tasty-Cookie', tastyCookie)
        return res
      })

      return app
    })()

    describe.each(Object.keys(apps))('%s', (name) => {
      const app = apps[name]
      it('Parse cookie with getCookie()', async () => {
        const req = new Request('http://localhost/cookie')
        const cookieString = 'yummy_cookie=choco; tasty_cookie = strawberry'
        req.headers.set('Cookie', cookieString)
        const res = await app.request(req)

        expect(res.headers.get('Yummy-Cookie')).toBe('choco')
        expect(res.headers.get('Tasty-Cookie')).toBe('strawberry')
      })
    })
  })

  describe('Set cookie', () => {
    const app = new Hono()

    app.get('/set-cookie', (c) => {
      setCookie(c, 'delicious_cookie', 'macha')
      return c.text('Give cookie')
    })

    it('Set cookie with setCookie()', async () => {
      const res = await app.request('http://localhost/set-cookie')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe('delicious_cookie=macha')
    })

    app.get('/set-cookie-complex', (c) => {
      setCookie(c, 'great_cookie', 'banana', {
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
      const res = await app.request('http://localhost/set-cookie-complex')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe(
        'great_cookie=banana; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict'
      )
    })

    app.get('/set-cookie-multiple', (c) => {
      setCookie(c, 'delicious_cookie', 'macha')
      setCookie(c, 'delicious_cookie', 'choco')
      return c.text('Give cookie')
    })

    it('Multiple values', async () => {
      const res = await app.request('http://localhost/set-cookie-multiple')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe('delicious_cookie=macha, delicious_cookie=choco')
    })
  })

  describe('Delete cookie', () => {
    const app = new Hono()

    app.get('/delete-cookie', (c) => {
      deleteCookie(c, 'delicious_cookie')
      return c.text('Give cookie')
    })

    it('Delete cookie', async () => {
      const res2 = await app.request('http://localhost/delete-cookie')
      expect(res2.status).toBe(200)
      const header2 = res2.headers.get('Set-Cookie')
      expect(header2).toBe('delicious_cookie=; Max-Age=0')
    })

    app.get('/delete-cookie-multiple', (c) => {
      deleteCookie(c, 'delicious_cookie')
      deleteCookie(c, 'delicious_cookie2')
      return c.text('Give cookie')
    })

    it('Delete multile cookies', async () => {
      const res2 = await app.request('http://localhost/delete-cookie-multiple')
      expect(res2.status).toBe(200)
      const header2 = res2.headers.get('Set-Cookie')
      expect(header2).toBe('delicious_cookie=; Max-Age=0, delicious_cookie2=; Max-Age=0')
    })
  })
})
