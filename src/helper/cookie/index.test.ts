import { Hono } from '../../hono'
import { deleteCookie, getCookie, getSignedCookie, setCookie, setSignedCookie } from '.'

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

    it('Get signed cookie with invalid signature', async () => {
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

    app.get('/get-secure-prefix-cookie', async (c) => {
      const cookie = getCookie(c, 'delicious_cookie', 'secure')
      if (cookie) {
        return c.text(cookie)
      } else {
        return c.notFound()
      }
    })

    app.get('/get-host-prefix-cookie', async (c) => {
      const cookie = getCookie(c, 'delicious_cookie', 'host')
      if (cookie) {
        return c.text(cookie)
      } else {
        return c.notFound()
      }
    })

    app.get('/set-secure-prefix-cookie', (c) => {
      setCookie(c, 'delicious_cookie', 'macha', {
        prefix: 'secure',
        secure: false, // this will be ignore
      })
      return c.text('Set secure prefix cookie')
    })

    it('Set cookie with secure prefix', async () => {
      const res = await app.request('http://localhost/set-secure-prefix-cookie')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe('__Secure-delicious_cookie=macha; Path=/; Secure')
    })

    it('Get cookie with secure prefix', async () => {
      const setCookie = await app.request('http://localhost/set-secure-prefix-cookie')
      const header = setCookie.headers.get('Set-Cookie')
      if (!header) {
        assert.fail('invalid header')
      }
      const res = await app.request('http://localhost/get-secure-prefix-cookie', {
        headers: {
          Cookie: header,
        },
      })
      const response = await res.text()
      expect(res.status).toBe(200)
      expect(response).toBe('macha')
    })

    app.get('/set-host-prefix-cookie', (c) => {
      setCookie(c, 'delicious_cookie', 'macha', {
        prefix: 'host',
        path: '/foo', // this will be ignored
        domain: 'example.com', // this will be ignored
        secure: false, // this will be ignored
      })
      return c.text('Set host prefix cookie')
    })

    it('Set cookie with host prefix', async () => {
      const res = await app.request('http://localhost/set-host-prefix-cookie')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe('__Host-delicious_cookie=macha; Path=/; Secure')
    })

    it('Get cookie with host prefix', async () => {
      const setCookie = await app.request('http://localhost/set-host-prefix-cookie')
      const header = setCookie.headers.get('Set-Cookie')
      if (!header) {
        assert.fail('invalid header')
      }
      const res = await app.request('http://localhost/get-host-prefix-cookie', {
        headers: {
          Cookie: header,
        },
      })
      const response = await res.text()
      expect(res.status).toBe(200)
      expect(response).toBe('macha')
    })

    app.get('/set-signed-secure-prefix-cookie', async (c) => {
      await setSignedCookie(c, 'delicious_cookie', 'macha', 'secret choco chips', {
        prefix: 'secure',
      })
      return c.text('Set secure prefix cookie')
    })

    it('Set signed cookie with secure prefix', async () => {
      const res = await app.request('http://localhost/set-signed-secure-prefix-cookie')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe(
        '__Secure-delicious_cookie=macha.i225faTyCrJUY8TvpTuJHI20HBWbQ89B4GV7lT4E%2FB0%3D; Path=/; Secure'
      )
    })

    app.get('/set-signed-host-prefix-cookie', async (c) => {
      await setSignedCookie(c, 'delicious_cookie', 'macha', 'secret choco chips', {
        prefix: 'host',
        domain: 'example.com', // this will be ignored
        path: 'example.com', // thi will be ignored
        secure: false, // this will be ignored
      })
      return c.text('Set host prefix cookie')
    })

    it('Set signed cookie with host prefix', async () => {
      const res = await app.request('http://localhost/set-signed-host-prefix-cookie')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      expect(header).toBe(
        '__Host-delicious_cookie=macha.i225faTyCrJUY8TvpTuJHI20HBWbQ89B4GV7lT4E%2FB0%3D; Path=/; Secure'
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

    app.get('/delete-cookie-with-deleted-value', (c) => {
      const deleted = deleteCookie(c, 'delicious_cookie')
      return c.text(deleted || '')
    })

    it('Get deleted value', async () => {
      const cookieString = 'delicious_cookie=choco'
      const req = new Request('http://localhost/delete-cookie-with-deleted-value')
      req.headers.set('Cookie', cookieString)
      const res = await app.request(req)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('choco')
    })
  })
})
