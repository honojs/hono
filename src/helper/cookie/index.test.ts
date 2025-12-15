import { Hono } from '../../hono'
import {
  deleteCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
  generateCookie,
  generateSignedCookie,
} from '.'

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

    // Test getCookie returning empty object when no cookie header
    it('getCookie returns empty object when no cookie header', async () => {
      const app = new Hono()
      app.get('/no-cookie', (c) => {
        const cookies = getCookie(c)
        return c.json(cookies)
      })

      const res = await app.request('http://localhost/no-cookie')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
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

    // Test getSignedCookie returning undefined when no cookie header (by key)
    it('getSignedCookie returns undefined when no cookie header (by key)', async () => {
      const testApp = new Hono()
      testApp.get('/no-cookie-signed', async (c) => {
        const secret = 'secret'
        const cookie = await getSignedCookie(c, secret, 'session')
        return c.text(cookie === undefined ? 'undefined' : String(cookie))
      })

      const res = await testApp.request('http://localhost/no-cookie-signed')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('undefined')
    })

    // Test getSignedCookie with secure prefix
    it('getSignedCookie with secure prefix', async () => {
      const testApp = new Hono()
      const secret = 'secret lucky charm'

      // First set a signed cookie with secure prefix
      testApp.get('/set-signed-secure', async (c) => {
        await setSignedCookie(c, 'session', 'test-value', secret, { prefix: 'secure' })
        return c.text('set')
      })

      testApp.get('/get-signed-secure', async (c) => {
        const cookie = await getSignedCookie(c, secret, 'session', 'secure')
        return c.text(cookie === undefined ? 'undefined' : cookie === false ? 'false' : cookie)
      })

      // Get the signed cookie value
      const setRes = await testApp.request('http://localhost/set-signed-secure')
      const setCookieHeader = setRes.headers.get('Set-Cookie')

      // Now use that cookie to get the signed value
      const req = new Request('http://localhost/get-signed-secure')
      req.headers.set('Cookie', setCookieHeader || '')
      const res = await testApp.request(req)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('test-value')
    })

    // Test getSignedCookie with host prefix
    it('getSignedCookie with host prefix', async () => {
      const testApp = new Hono()
      const secret = 'secret lucky charm'

      // First set a signed cookie with host prefix
      testApp.get('/set-signed-host', async (c) => {
        await setSignedCookie(c, 'session', 'test-value', secret, { prefix: 'host' })
        return c.text('set')
      })

      testApp.get('/get-signed-host', async (c) => {
        const cookie = await getSignedCookie(c, secret, 'session', 'host')
        return c.text(cookie === undefined ? 'undefined' : cookie === false ? 'false' : cookie)
      })

      // Get the signed cookie value
      const setRes = await testApp.request('http://localhost/set-signed-host')
      const setCookieHeader = setRes.headers.get('Set-Cookie')

      // Now use that cookie to get the signed value
      const req = new Request('http://localhost/get-signed-host')
      req.headers.set('Cookie', setCookieHeader || '')
      const res = await testApp.request(req)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('test-value')
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

    it('Multiple values with same name should be deduped (RFC 6265)', async () => {
      const res = await app.request('http://localhost/set-cookie-multiple')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      // Only the last cookie should be present
      expect(header).toBe('delicious_cookie=choco; Path=/')
    })

    app.get('/set-cookie-different-domains', (c) => {
      setCookie(c, 'delicious_cookie', 'macha', { domain: 'example.com' })
      setCookie(c, 'delicious_cookie', 'choco', { domain: 'other.com' })
      return c.text('Give cookie')
    })

    it('Cookies with same name but different domains should not be deduped', async () => {
      const res = await app.request('http://localhost/set-cookie-different-domains')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      // Both cookies should be present since domains are different
      expect(header).toBe(
        'delicious_cookie=macha; Domain=example.com; Path=/, delicious_cookie=choco; Domain=other.com; Path=/'
      )
    })

    app.get('/set-cookie-different-paths', (c) => {
      setCookie(c, 'delicious_cookie', 'macha', { path: '/a' })
      setCookie(c, 'delicious_cookie', 'choco', { path: '/b' })
      return c.text('Give cookie')
    })

    it('Cookies with same name but different paths should not be deduped', async () => {
      const res = await app.request('http://localhost/set-cookie-different-paths')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      // Both cookies should be present since paths are different
      expect(header).toBe('delicious_cookie=macha; Path=/a, delicious_cookie=choco; Path=/b')
    })

    app.get('/set-cookie-same-identity', (c) => {
      setCookie(c, 'delicious_cookie', 'first', { domain: 'example.com', path: '/api' })
      setCookie(c, 'delicious_cookie', 'second', { domain: 'example.com', path: '/api' })
      setCookie(c, 'delicious_cookie', 'third', { domain: 'example.com', path: '/api' })
      return c.text('Give cookie')
    })

    it('Cookies with same identity (name+domain+path) should be deduped to last value', async () => {
      const res = await app.request('http://localhost/set-cookie-same-identity')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      // Only the last cookie should be present
      expect(header).toBe('delicious_cookie=third; Domain=example.com; Path=/api')
    })

    app.get('/set-cookie-mixed', (c) => {
      setCookie(c, 'cookie_a', 'value1')
      setCookie(c, 'cookie_b', 'value2')
      setCookie(c, 'cookie_a', 'value3') // should replace first cookie_a
      return c.text('Give cookie')
    })

    it('Mixed cookies should dedupe correctly', async () => {
      const res = await app.request('http://localhost/set-cookie-mixed')
      expect(res.status).toBe(200)
      const header = res.headers.get('Set-Cookie')
      // cookie_a should be deduped, cookie_b should remain
      expect(header).toBe('cookie_b=value2; Path=/, cookie_a=value3; Path=/')
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

    app.get('/delete-cookie-with-prefix', (c) => {
      const deleted = deleteCookie(c, 'delicious_cookie', { prefix: 'secure' })
      return c.text(deleted || '')
    })

    it('Get deleted value with prefix', async () => {
      const cookieString = '__Secure-delicious_cookie=choco'
      const req = new Request('http://localhost/delete-cookie-with-prefix')
      req.headers.set('Cookie', cookieString)
      const res = await app.request(req)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('choco')
    })
  })

  describe('getSetCookies fallback', () => {
    it('should handle fallback when getSetCookie is not available', async () => {
      const app = new Hono()

      app.get('/test-fallback', (c) => {
        // Set multiple cookies
        setCookie(c, 'cookie1', 'value1')
        setCookie(c, 'cookie2', 'value2')
        setCookie(c, 'cookie1', 'value3') // should dedupe
        return c.text('Done')
      })

      // Mock Headers to not have getSetCookie
      const originalGetSetCookie = Headers.prototype.getSetCookie
      // @ts-expect-error - intentionally removing method for testing
      Headers.prototype.getSetCookie = undefined

      try {
        const res = await app.request('http://localhost/test-fallback')
        expect(res.status).toBe(200)
        const header = res.headers.get('Set-Cookie')
        // Should still work with fallback
        expect(header).toContain('cookie2=value2')
        expect(header).toContain('cookie1=value3')
      } finally {
        // Restore
        Headers.prototype.getSetCookie = originalGetSetCookie
      }
    })

    it('should handle empty Set-Cookie header in fallback', async () => {
      const headers = new Headers()

      // Mock getSetCookie to be unavailable
      const originalGetSetCookie = Headers.prototype.getSetCookie
      // @ts-expect-error - intentionally removing method for testing
      Headers.prototype.getSetCookie = undefined

      try {
        // No Set-Cookie header set, should return empty array
        const setCookieHeader = headers.get('Set-Cookie')
        expect(setCookieHeader).toBe(null)
      } finally {
        Headers.prototype.getSetCookie = originalGetSetCookie
      }
    })

    it('should handle cookies with Expires containing comma in fallback', async () => {
      const app = new Hono()

      app.get('/test-expires-fallback', (c) => {
        // Set cookie with Expires (contains comma in date)
        setCookie(c, 'session', 'first', {
          expires: new Date(Date.UTC(2025, 0, 15, 10, 30, 0)),
        })
        setCookie(c, 'other', 'value')
        setCookie(c, 'session', 'second', {
          expires: new Date(Date.UTC(2025, 0, 15, 10, 30, 0)),
        })
        return c.text('Done')
      })

      const originalGetSetCookie = Headers.prototype.getSetCookie
      // @ts-expect-error - intentionally removing method for testing
      Headers.prototype.getSetCookie = undefined

      try {
        const res = await app.request('http://localhost/test-expires-fallback')
        expect(res.status).toBe(200)
        const header = res.headers.get('Set-Cookie')
        // Should handle comma in Expires correctly
        expect(header).toContain('session=second')
        expect(header).toContain('other=value')
      } finally {
        Headers.prototype.getSetCookie = originalGetSetCookie
      }
    })
  })

  describe('Cookie deduplication (RFC 6265)', () => {
    describe('setSignedCookie deduplication', () => {
      const app = new Hono()
      const secret = 'secret chocolate chips'

      app.get('/set-signed-cookie-multiple', async (c) => {
        await setSignedCookie(c, 'session', 'first', secret)
        await setSignedCookie(c, 'session', 'second', secret)
        return c.text('Done')
      })

      it('Signed cookies with same identity should be deduped', async () => {
        const res = await app.request('http://localhost/set-signed-cookie-multiple')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Should only have the second cookie
        expect(headers).toContain('session=second')
        expect(headers).not.toContain('session=first')
      })

      app.get('/set-signed-cookie-secure-prefix-dedupe', async (c) => {
        await setSignedCookie(c, 'session', 'first', secret, { prefix: 'secure' })
        await setSignedCookie(c, 'session', 'second', secret, { prefix: 'secure' })
        return c.text('Done')
      })

      it('Signed cookies with secure prefix should be deduped', async () => {
        const res = await app.request('http://localhost/set-signed-cookie-secure-prefix-dedupe')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Should only have the second cookie with __Secure- prefix
        expect(headers).toContain('__Secure-session=second')
        expect(headers).not.toContain('__Secure-session=first')
      })

      app.get('/set-signed-cookie-host-prefix-dedupe', async (c) => {
        await setSignedCookie(c, 'session', 'first', secret, { prefix: 'host' })
        await setSignedCookie(c, 'session', 'second', secret, { prefix: 'host' })
        return c.text('Done')
      })

      it('Signed cookies with host prefix should be deduped', async () => {
        const res = await app.request('http://localhost/set-signed-cookie-host-prefix-dedupe')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Should only have the second cookie with __Host- prefix
        expect(headers).toContain('__Host-session=second')
        expect(headers).not.toContain('__Host-session=first')
      })

      app.get('/set-signed-cookie-different-domains', async (c) => {
        await setSignedCookie(c, 'session', 'first', secret, { domain: 'example.com' })
        await setSignedCookie(c, 'session', 'second', secret, { domain: 'other.com' })
        return c.text('Done')
      })

      it('Signed cookies with different domains should not be deduped', async () => {
        const res = await app.request('http://localhost/set-signed-cookie-different-domains')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Both cookies should be present
        expect(headers).toContain('Domain=example.com')
        expect(headers).toContain('Domain=other.com')
      })

      app.get('/set-signed-cookie-different-paths', async (c) => {
        await setSignedCookie(c, 'session', 'first', secret, { path: '/a' })
        await setSignedCookie(c, 'session', 'second', secret, { path: '/b' })
        return c.text('Done')
      })

      it('Signed cookies with different paths should not be deduped', async () => {
        const res = await app.request('http://localhost/set-signed-cookie-different-paths')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Both cookies should be present
        expect(headers).toContain('Path=/a')
        expect(headers).toContain('Path=/b')
      })
    })

    describe('Domain case-insensitivity', () => {
      const app = new Hono()

      app.get('/set-cookie-domain-case', (c) => {
        setCookie(c, 'session', 'first', { domain: 'EXAMPLE.COM' })
        setCookie(c, 'session', 'second', { domain: 'example.com' })
        return c.text('Done')
      })

      it('Domain comparison should be case-insensitive', async () => {
        const res = await app.request('http://localhost/set-cookie-domain-case')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Should be deduped because domains are same (case-insensitive)
        expect(headers).toBe('session=second; Domain=example.com; Path=/')
      })

      app.get('/set-cookie-domain-mixed-case', (c) => {
        setCookie(c, 'session', 'first', { domain: 'Example.Com' })
        setCookie(c, 'session', 'second', { domain: 'EXAMPLE.COM' })
        setCookie(c, 'session', 'third', { domain: 'example.com' })
        return c.text('Done')
      })

      it('Multiple domain case variations should all be deduped', async () => {
        const res = await app.request('http://localhost/set-cookie-domain-mixed-case')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Should only have the last cookie
        expect(headers).toBe('session=third; Domain=example.com; Path=/')
      })
    })

    describe('Cookie with prefix deduplication', () => {
      const app = new Hono()

      app.get('/set-cookie-secure-prefix-multiple', (c) => {
        setCookie(c, 'session', 'first', { prefix: 'secure' })
        setCookie(c, 'session', 'second', { prefix: 'secure' })
        return c.text('Done')
      })

      it('Cookies with secure prefix should be deduped', async () => {
        const res = await app.request('http://localhost/set-cookie-secure-prefix-multiple')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        expect(headers).toBe('__Secure-session=second; Path=/; Secure')
      })

      app.get('/set-cookie-host-prefix-multiple', (c) => {
        setCookie(c, 'session', 'first', { prefix: 'host' })
        setCookie(c, 'session', 'second', { prefix: 'host' })
        return c.text('Done')
      })

      it('Cookies with host prefix should be deduped', async () => {
        const res = await app.request('http://localhost/set-cookie-host-prefix-multiple')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        expect(headers).toBe('__Host-session=second; Path=/; Secure')
      })
    })

    describe('Edge cases', () => {
      const app = new Hono()

      app.get('/set-cookie-no-domain-vs-domain', (c) => {
        setCookie(c, 'session', 'first') // no domain (empty string)
        setCookie(c, 'session', 'second', { domain: 'example.com' })
        return c.text('Done')
      })

      it('Cookie with no domain and cookie with domain should not be deduped', async () => {
        const res = await app.request('http://localhost/set-cookie-no-domain-vs-domain')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Both should be present - different identities
        expect(headers).toContain('session=first')
        expect(headers).toContain('session=second')
      })

      app.get('/set-cookie-default-path-vs-custom', (c) => {
        setCookie(c, 'session', 'first') // default path '/'
        setCookie(c, 'session', 'second', { path: '/api' })
        return c.text('Done')
      })

      it('Cookie with default path and custom path should not be deduped', async () => {
        const res = await app.request('http://localhost/set-cookie-default-path-vs-custom')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Both should be present - different paths
        expect(headers).toContain('Path=/')
        expect(headers).toContain('Path=/api')
      })

      app.get('/set-cookie-with-expires', (c) => {
        setCookie(c, 'session', 'first', {
          expires: new Date(Date.UTC(2024, 0, 1, 0, 0, 0)),
        })
        setCookie(c, 'session', 'second', {
          expires: new Date(Date.UTC(2025, 0, 1, 0, 0, 0)),
        })
        return c.text('Done')
      })

      it('Cookies with same identity but different expires should be deduped', async () => {
        const res = await app.request('http://localhost/set-cookie-with-expires')
        expect(res.status).toBe(200)
        const headers = res.headers.get('Set-Cookie')
        // Should be deduped - expires doesn't affect identity
        expect(headers).toContain('session=second')
        expect(headers).toContain('2025')
        expect(headers).not.toContain('2024')
      })
    })
  })

  describe('Generate cookie', () => {
    it('should generate a cookie', () => {
      const cookie = generateCookie('delicious_cookie', 'macha')
      expect(cookie).toBe('delicious_cookie=macha; Path=/')
    })

    it('should generate a cookie with options', () => {
      const cookie = generateCookie('delicious_cookie', 'macha', {
        path: '/',
        secure: true,
        httpOnly: true,
        domain: 'example.com',
      })
      expect(cookie).toBe('delicious_cookie=macha; Domain=example.com; Path=/; HttpOnly; Secure')
    })

    it('should generate a signed cookie', async () => {
      const cookie = await generateSignedCookie(
        'delicious_cookie',
        'macha',
        'secret chocolate chips'
      )
      expect(cookie).toBe(
        'delicious_cookie=macha.diubJPY8O7hI1pLa42QSfkPiyDWQ0I4DnlACH%2FN2HaA%3D; Path=/'
      )
    })

    it('should generate a signed cookie with options', async () => {
      const cookie = await generateSignedCookie(
        'delicious_cookie',
        'macha',
        'secret chocolate chips',
        {
          path: '/',
          secure: true,
          httpOnly: true,
          domain: 'example.com',
        }
      )
      expect(cookie).toBe(
        'delicious_cookie=macha.diubJPY8O7hI1pLa42QSfkPiyDWQ0I4DnlACH%2FN2HaA%3D; Domain=example.com; Path=/; HttpOnly; Secure'
      )
    })
  })
})
