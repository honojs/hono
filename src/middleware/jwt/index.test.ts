import { describe } from 'vitest'
import { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import { jwt } from '.'

describe('JWT', () => {
  describe('Credentials in header', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use('/auth/*', jwt({ secret: 'a-secret' }))
    app.use('/auth-unicode/*', jwt({ secret: 'a-secret' }))
    app.use('/nested/*', async (c, next) => {
      const auth = jwt({ secret: 'a-secret' })
      return auth(c, next)
    })

    app.get('/auth/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-unicode/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/nested/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const req = new Request('http://localhost/auth/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize Unicode', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const req = new Request('http://localhost/auth-unicode/a')
      req.headers.set('Authorization', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
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
      expect(handlerExecuted).toBeFalsy()
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
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should not authorize - nested', async () => {
      const req = new Request('http://localhost/nested/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize - nested', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const req = new Request('http://localhost/nested/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })
  })

  describe('Credentials in custom header', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use('/auth/*', jwt({ secret: 'a-secret', headerName: 'x-custom-auth-header' }))
    app.use('/auth-unicode/*', jwt({ secret: 'a-secret', headerName: 'x-custom-auth-header' }))
    app.use('/nested/*', async (c, next) => {
      const auth = jwt({ secret: 'a-secret', headerName: 'x-custom-auth-header' })
      return auth(c, next)
    })

    app.get('/auth/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-unicode/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/nested/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should not authorize even if default authorization header present', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const req = new Request('http://localhost/auth/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const req = new Request('http://localhost/auth/a')
      req.headers.set('x-custom-auth-header', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize Unicode', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const req = new Request('http://localhost/auth-unicode/a')
      req.headers.set('x-custom-auth-header', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should not authorize Unicode', async () => {
      const invalidToken =
        'ssyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const url = 'http://localhost/auth-unicode/a'
      const req = new Request(url)
      req.headers.set('x-custom-auth-header', `Basic ${invalidToken}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(res.headers.get('www-authenticate')).toEqual(
        `Bearer realm="${url}",error="invalid_token",error_description="token verification failure"`
      )
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should not authorize Unicode even if default authorization header present', async () => {
      const invalidToken =
        'ssyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const url = 'http://localhost/auth-unicode/a'
      const req = new Request(url)
      req.headers.set('Authorization', `Basic ${invalidToken}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(res.headers.get('www-authenticate')).toEqual(
        `Bearer realm="${url}",error="invalid_request",error_description="no authorization included in request"`
      )
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should not authorize', async () => {
      const invalid_token = 'invalid token'
      const url = 'http://localhost/auth/a'
      const req = new Request(url)
      req.headers.set('x-custom-auth-header', `Bearer ${invalid_token}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(res.headers.get('www-authenticate')).toEqual(
        `Bearer realm="${url}",error="invalid_request",error_description="invalid credentials structure"`
      )
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should not authorize - nested', async () => {
      const req = new Request('http://localhost/nested/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should not authorize - nested even if default authorization header present', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const req = new Request('http://localhost/nested/a')
      const res = await app.request(req)
      req.headers.set('Authorization', `Bearer ${credential}`)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize - nested', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const req = new Request('http://localhost/nested/a')
      req.headers.set('x-custom-auth-header', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })
  })

  describe('Credentials in cookie', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use('/auth/*', jwt({ secret: 'a-secret', cookie: 'access_token' }))
    app.use('/auth-unicode/*', jwt({ secret: 'a-secret', cookie: 'access_token' }))

    app.get('/auth/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-unicode/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const url = 'http://localhost/auth/a'
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const req = new Request(url, {
        headers: new Headers({
          Cookie: `access_token=${credential}`,
        }),
      })
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(res.status).toBe(200)
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize Unicode', async () => {
      const credential =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const req = new Request('http://localhost/auth-unicode/a', {
        headers: new Headers({
          Cookie: `access_token=${credential}`,
        }),
      })
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
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
      expect(handlerExecuted).toBeFalsy()
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
      expect(handlerExecuted).toBeFalsy()
    })
  })

  describe('Error handling with `cause`', () => {
    const app = new Hono()

    app.use('/auth/*', jwt({ secret: 'a-secret' }))
    app.get('/auth/*', (c) => c.text('Authorized'))

    app.onError((e, c) => {
      if (e instanceof HTTPException && e.cause instanceof Error) {
        return c.json({ name: e.cause.name, message: e.cause.message }, 401)
      }
      return c.text(e.message, 401)
    })

    it('Should not authorize', async () => {
      const credential = 'abc.def.ghi'
      const req = new Request('http://localhost/auth')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({
        name: 'JwtTokenInvalid',
        message: `invalid JWT token: ${credential}`,
      })
    })
  })

  describe('Credentials in signed cookie with prefix Options', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use(
      '/auth/*',
      jwt({
        secret: 'a-secret',
        cookie: {
          key: 'cookie_name',
          secret: 'cookie_secret',
          prefixOptions: 'host',
        },
      })
    )

    app.get('/auth/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const url = 'http://localhost/auth/a'
      const req = new Request(url, {
        headers: new Headers({
          Cookie:
            '__Host-cookie_name=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE.i2NSvtJOXOPS9NDL1u8dqTYmMrzcD4mNSws6P6qmeV0%3D; Path=/',
        }),
      })
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })
  })

  describe('Credentials in signed cookie without prefix Options', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use(
      '/auth/*',
      jwt({
        secret: 'a-secret',
        cookie: {
          key: 'cookie_name',
          secret: 'cookie_secret',
        },
      })
    )

    app.get('/auth/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const url = 'http://localhost/auth/a'
      const req = new Request(url, {
        headers: new Headers({
          Cookie:
            'cookie_name=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE.i2NSvtJOXOPS9NDL1u8dqTYmMrzcD4mNSws6P6qmeV0%3D; Path=/',
        }),
      })
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })
  })

  describe('Credentials in cookie object with prefix Options', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use(
      '/auth/*',
      jwt({
        secret: 'a-secret',
        cookie: {
          key: 'cookie_name',
          prefixOptions: 'host',
        },
      })
    )

    app.get('/auth/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const url = 'http://localhost/auth/a'
      const req = new Request(url, {
        headers: new Headers({
          Cookie:
            '__Host-cookie_name=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE',
        }),
      })
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })
  })

  describe('Credentials in cookie object without prefix Options', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use(
      '/auth/*',
      jwt({
        secret: 'a-secret',
        cookie: {
          key: 'cookie_name',
        },
      })
    )

    app.get('/auth/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const url = 'http://localhost/auth/a'
      const req = new Request(url, {
        headers: new Headers({
          Cookie:
            'cookie_name=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE',
        }),
      })
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })
  })
})
