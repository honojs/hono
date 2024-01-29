import { Hono } from '../../hono'
import { getCookie, getSignedCookie, setCookie, setSignedCookie, deleteCookie } from '.'

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

    const app = new Hono()

    app.get('/cookie-signed-get-all', async (c) => {
      const secret = 'secret lucky charm'
      const { fortune_cookie: fortuneCookie, fruit_cookie: fruitCookie } = await getSignedCookie(
        c,
        secret
      )
      const res = new Response('Signed fortune cookie')
      if (typeof fortuneCookie !== 'undefined' && typeof fruitCookie !== 'undefined') {
        // just examples for tests sake
        res.headers.set('Fortune-Cookie', fortuneCookie || 'INVALID')
        res.headers.set('Fruit-Cookie', fruitCookie || 'INVALID')
      }
      return res
    })

    app.get('/cookie-signed-get-one', async (c) => {
      const secret = 'secret lucky charm'
      const fortuneCookie = await getSignedCookie(c, secret, 'fortune_cookie')
      const res = new Response('Signed fortune cookie')
      if (typeof fortuneCookie !== 'undefined') {
        // just an example for tests sake
        res.headers.set('Fortune-Cookie', fortuneCookie || 'INVALID')
      }
      return res
    })

    it('Get signed cookies', async () => {
      const req = new Request('http://localhost/cookie-signed-get-all')
      const cookieString =
        'fortune_cookie=lots-of-money.UO6vMygDM6NCDU4LdvBnzdVb2Xcdj+h+ZTnmS8X7iH8%3D; fruit_cookie=mango.lRwgtW9ooM9%2Fd9ZZA%2FInNRG64CbQsfWGXQyFLPM9520%3D'
      req.headers.set('Cookie', cookieString)
      const res = await app.request(req)
      expect(res.headers.get('Fortune-Cookie')).toBe('lots-of-money')
      expect(res.headers.get('Fruit-Cookie')).toBe('mango')
    })

    it('Get signed cookies invalid signature', async () => {
      const req = new Request('http://localhost/cookie-signed-get-all')
      // fruit_cookie has invalid signature
      const cookieString =
        'fortune_cookie=lots-of-money.UO6vMygDM6NCDU4LdvBnzdVb2Xcdj+h+ZTnmS8X7iH8%3D; fruit_cookie=mango.LAa7RX43t2vCrLNcKmNG65H41OkyV02sraRPuY5RuVg%3D'
      req.headers.set('Cookie', cookieString)
      const res = await app.request(req)
      expect(res.headers.get('Fortune-Cookie')).toBe('lots-of-money')
      expect(res.headers.get('Fruit-Cookie')).toBe('INVALID')
    })

    it('Get signed cookie', async () => {
      const req = new Request('http://localhost/cookie-signed-get-one')
      const cookieString =
        'fortune_cookie=lots-of-money.UO6vMygDM6NCDU4LdvBnzdVb2Xcdj+h+ZTnmS8X7iH8%3D; fruit_cookie=mango.lRwgtW9ooM9%2Fd9ZZA%2FInNRG64CbQsfWGXQyFLPM9520%3D'
      req.headers.set('Cookie', cookieString)
      const res = await app.request(req)
      expect(res.headers.get('Fortune-Cookie')).toBe('lots-of-money')
    })

    it('Get signed cookie witn invalid signature', async () => {
      const req = new Request('http://localhost/cookie-signed-get-one')
      // fortune_cookie has invalid signature
      const cookieString =
        'fortune_cookie=lots-of-money.LAa7RX43t2vCrLNcKmNG65H41OkyV02sraRPuY5RuVg=; fruit_cookie=mango.lRwgtW9ooM9%2Fd9ZZA%2FInNRG64CbQsfWGXQyFLPM9520%3D'
      req.headers.set('Cookie', cookieString)
      const res = await app.request(req)
      expect(res.headers.get('Fortune-Cookie')).toBe('INVALID')
    })

    describe('get null if the value is undefined', () => {
      const app = new Hono()

      app.get('/cookie', (c) => {
        const yummyCookie = getCookie(c, 'yummy_cookie')
        const res = new Response('Good cookie')
        if (yummyCookie) {
          res.headers.set('Yummy-Cookie', yummyCookie)
        }
        return res
      })

      it('Should be null', async () => {
        const req = new Request('http://localhost/cookie')
        const cookieString = 'yummy_cookie='
        req.headers.set('Cookie', cookieString)
        const res = await app.request(req)
        expect(res.headers.get('Yummy-Cookie')).toBe(null)
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
      expect(header).toBe('delicious_cookie=macha; Path=/')
    })

    app.get('/a/set-cookie-path', (c) => {
      setCookie(c, 'delicious_cookie', 'macha', { path: '/a' })
      return c.text('Give cookie')
    })

    it('Set cookie with setCookie() and path option', async () => {
      const res = await app.request('http://localhost/a/set-cookie-path')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe('delicious_cookie=macha; Path=/a')
    })

    app.get('/set-signed-cookie', async (c) => {
      const secret = 'secret chocolate chips'
      await setSignedCookie(c, 'delicious_cookie', 'macha', secret)
      return c.text('Give signed cookie')
    })

    it('Set signed cookie with setSignedCookie()', async () => {
      const res = await app.request('http://localhost/set-signed-cookie')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe(
        'delicious_cookie=macha.diubJPY8O7hI1pLa42QSfkPiyDWQ0I4DnlACH%2FN2HaA%3D; Path=/'
      )
    })

    app.get('/a/set-signed-cookie-path', async (c) => {
      const secret = 'secret chocolate chips'
      await setSignedCookie(c, 'delicious_cookie', 'macha', secret, { path: '/a' })
      return c.text('Give signed cookie')
    })

    it('Set signed cookie with setSignedCookie() and path option', async () => {
      const res = await app.request('http://localhost/a/set-signed-cookie-path')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe(
        'delicious_cookie=macha.diubJPY8O7hI1pLa42QSfkPiyDWQ0I4DnlACH%2FN2HaA%3D; Path=/a'
      )
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

    app.get('/set-signed-cookie-complex', async (c) => {
      const secret = 'secret chocolate chips'
      await setSignedCookie(c, 'great_cookie', 'banana', secret, {
        path: '/',
        secure: true,
        domain: 'example.com',
        httpOnly: true,
        maxAge: 1000,
        expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
        sameSite: 'Strict',
      })
      return c.text('Give signed cookie')
    })

    it('Complex pattern (signed)', async () => {
      const res = await app.request('http://localhost/set-signed-cookie-complex')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe(
        'great_cookie=banana.hSo6gB7YT2db0WBiEAakEmh7dtwEL0DSp76G23WvHuQ%3D; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict'
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
      expect(header).toBe('delicious_cookie=macha; Path=/, delicious_cookie=choco; Path=/')
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
      expect(header2).toBe('delicious_cookie=; Max-Age=0; Path=/')
    })

    app.get('/delete-cookie-multiple', (c) => {
      deleteCookie(c, 'delicious_cookie')
      deleteCookie(c, 'delicious_cookie2')
      return c.text('Give cookie')
    })

    it('Delete multiple cookies', async () => {
      const res2 = await app.request('http://localhost/delete-cookie-multiple')
      expect(res2.status).toBe(200)
      const header2 = res2.headers.get('Set-Cookie')
      expect(header2).toBe(
        'delicious_cookie=; Max-Age=0; Path=/, delicious_cookie2=; Max-Age=0; Path=/'
      )
    })

    app.get('/delete-cookie-with-options', (c) => {
      deleteCookie(c, 'delicious_cookie', {
        path: '/',
        secure: true,
        domain: 'example.com',
      })
      return c.text('Give cookie')
    })

    it('Delete cookie with options', async () => {
      const res2 = await app.request('http://localhost/delete-cookie-with-options')
      expect(res2.status).toBe(200)
      const header2 = res2.headers.get('Set-Cookie')
      expect(header2).toBe('delicious_cookie=; Max-Age=0; Domain=example.com; Path=/; Secure')
    })
  })
})
