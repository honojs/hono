import { Hono } from '../../hono'
import { jwt } from '.'


describe('JWT', () => {
  describe('Credentials in header', () => {
    const crypto = global.crypto
    beforeAll(() => {
      global.crypto = require('crypto').webcrypto
    })
    afterAll(() => {
      global.crypto = crypto
    })

    const app = new Hono()

    app.use('/*', async (c, next) => {
      await next()
      c.header('x-foo', c.get('x-foo') || '')
    })

    app.use('/auth/*', jwt({ secret: 'a-secret' }))
    app.use('/auth-unicode/*', jwt({ secret: 'a-secret' }))

    app.get('/auth/*', (c) => {
      c.set('x-foo', 'bar')
      return new Response('auth')
    })
    app.get('/auth-unicode/*', (c) => {
      c.set('x-foo', 'bar')
      return new Response('auth')
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(res.headers.get('x-foo')).toBeFalsy()
    })

    it('Should authorize', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const req = new Request('http://localhost/auth/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('auth')
      expect(res.headers.get('x-foo')).toBe('bar')
    })

    it('Should authorize Unicode', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const req = new Request('http://localhost/auth-unicode/a')
      req.headers.set('Authorization', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('auth')
      expect(res.headers.get('x-foo')).toBe('bar')
    })

    it('Should not authorize Unicode', async () => {
      const invalidToken =
        'ssyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const url = 'http://localhost/auth-unicode/a'
      const req = new Request(url)
      req.headers.set('Authorization', `Basic ${invalidToken}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(res.headers.get('www-authenticate')).toEqual(
        `Bearer realm="${url}",error="invalid_token",error_description="token verification failure"`
      )
      expect(res.headers.get('x-foo')).toBeFalsy()
    })

    it('Should not authorize', async () => {
      const invalid_token = 'invalid token'
      const url = 'http://localhost/auth/a'
      const req = new Request(url)
      req.headers.set('Authorization', `Bearer ${invalid_token}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(res.headers.get('www-authenticate')).toEqual(
        `Bearer realm="${url}",error="invalid_request",error_description="invalid credentials structure"`
      )
      expect(res.headers.get('x-foo')).toBeFalsy()
    })
  })

  describe('Credentials in cookie', () => {
    const crypto = global.crypto
    beforeAll(() => {
      global.crypto = require('crypto').webcrypto
    })
    afterAll(() => {
      global.crypto = crypto
    })

    const app = new Hono()

    app.use('/*', async (c, next) => {
      await next()
      c.header('x-foo', c.get('x-foo') || '')
    })

    app.use('/auth/*', jwt({ secret: 'a-secret', cookie: 'access_token' }))
    app.use('/auth-unicode/*', jwt({ secret: 'a-secret', cookie: 'access_token' }))

    app.get('/auth/*', (c) => {
      c.set('x-foo', 'bar')
      return new Response('auth')
    })
    app.get('/auth-unicode/*', (c) => {
      c.set('x-foo', 'bar')
      return new Response('auth')
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(res.headers.get('x-foo')).toBeFalsy()
    })

    it('Should authorize', async () => {
      const url = 'http://localhost/auth/a'
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const req = new Request(url, {
        headers: new Headers({
          'Cookie': `access_token=${credential}`,
        })
      })
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(await res.text()).toBe('auth')
      expect(res.status).toBe(200)
      expect(res.headers.get('x-foo')).toBe('bar')
    })

    it('Should authorize Unicode', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const req = new Request('http://localhost/auth-unicode/a', {
        headers: new Headers({
          'Cookie': `access_token=${credential}`,
        })
      })
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('auth')
      expect(res.headers.get('x-foo')).toBe('bar')
    })

    it('Should not authorize Unicode', async () => {
      const invalidToken =
        'ssyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const url = 'http://localhost/auth-unicode/a'
      const req = new Request(url)
      req.headers.set('Cookie', `access_token=${invalidToken}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(res.headers.get('www-authenticate')).toEqual(
        `Bearer realm="${url}",error="invalid_token",error_description="token verification failure"`
      )
      expect(res.headers.get('x-foo')).toBeFalsy()
    })

    it('Should not authorize', async () => {
      const invalidToken = 'invalid token'
      const url = 'http://localhost/auth/a'
      const req = new Request(url)
      req.headers.set('Cookie', `access_token=${invalidToken}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(res.headers.get('www-authenticate')).toEqual(
        `Bearer realm="${url}",error="invalid_token",error_description="token verification failure"`
      )
      expect(res.headers.get('x-foo')).toBeFalsy()
    })
  })
})