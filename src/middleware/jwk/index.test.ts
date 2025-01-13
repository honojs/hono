import { serve } from '@hono/node-server'
import type { AddressInfo } from 'net'
import { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import { Jwt } from '../../utils/jwt'
import * as test_keys from './keys.test.json'
import { jwk } from '.'

const verify_keys = test_keys.public_keys

describe('JWK', () => {
  const resource_server = new Hono()
  resource_server.get('/.well-known/jwks.json', (c) => c.json({ keys: verify_keys }))
  const server = serve({ fetch: resource_server.fetch })
  const port = (server.address() as AddressInfo).port

  describe('Credentials in header', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use('/auth-with-keys/*', jwk({ keys: verify_keys }))
    app.use('/auth-with-keys-unicode/*', jwk({ keys: verify_keys }))
    app.use('/auth-with-keys-nested/*', async (c, next) => {
      const auth = jwk({ keys: verify_keys })
      return auth(c, next)
    })
    app.use(
      '/auth-with-keys-fn/*',
      jwk({
        keys: async () => {
          const response = await fetch(`http://localhost:${port}/.well-known/jwks.json`)
          const data = await response.json()
          return data.keys
        },
      })
    )
    app.use(
      '/auth-with-jwks_uri/*',
      jwk({
        jwks_uri: `http://localhost:${port}/.well-known/jwks.json`,
      })
    )

    app.get('/auth-with-keys/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-keys-unicode/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-keys-nested/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-keys-fn/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-jwks_uri/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize requests with missing access token', async () => {
      const req = new Request('http://localhost/auth-with-keys/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize from a static array passed to options.keys (key 1)', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-keys/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize from a static array passed to options.keys (key 2)', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[1])
      const req = new Request('http://localhost/auth-with-keys/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize with Unicode payload from a static array passed to options.keys', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-keys-unicode/a')
      req.headers.set('Authorization', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize from a function passed to options.keys', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-keys-fn/a')
      req.headers.set('Authorization', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize from a URI remotely fetched from options.jwks_uri', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-jwks_uri/a')
      req.headers.set('Authorization', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should not authorize requests with invalid Unicode payload in header', async () => {
      const invalidToken =
        'ssyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const url = 'http://localhost/auth-with-keys-unicode/a'
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

    it('Should not authorize requests with malformed token structure in header', async () => {
      const invalid_token = 'invalid token'
      const url = 'http://localhost/auth-with-keys/a'
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

    it('Should not authorize requests without authorization in nested JWK middleware', async () => {
      const req = new Request('http://localhost/auth-with-keys-nested/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize requests with authorization in nested JWK middleware', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-keys-nested/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
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

    app.use('/auth-with-keys/*', jwk({ keys: verify_keys, cookie: 'access_token' }))
    app.use('/auth-with-keys-unicode/*', jwk({ keys: verify_keys, cookie: 'access_token' }))

    app.get('/auth-with-keys/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-keys-unicode/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize requests with missing access token', async () => {
      const req = new Request('http://localhost/auth-with-keys/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize from a static array passed to options.keys', async () => {
      const url = 'http://localhost/auth-with-keys/a'
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
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

    it('Should authorize with Unicode payload from a static array passed to options.keys', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-keys-unicode/a', {
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

    it('Should not authorize requests with invalid Unicode payload in cookie', async () => {
      const invalidToken =
        'ssyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

      const url = 'http://localhost/auth-with-keys-unicode/a'
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

    it('Should not authorize requests with malformed token structure in cookie', async () => {
      const invalidToken = 'invalid token'
      const url = 'http://localhost/auth-with-keys/a'
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

    app.use('/auth-with-keys/*', jwk({ keys: verify_keys }))
    app.get('/auth-with-keys/*', (c) => c.text('Authorized'))

    app.onError((e, c) => {
      if (e instanceof HTTPException && e.cause instanceof Error) {
        return c.json({ name: e.cause.name, message: e.cause.message }, 401)
      }
      return c.text(e.message, 401)
    })

    it('Should not authorize', async () => {
      const credential = 'abc.def.ghi'
      const req = new Request('http://localhost/auth-with-keys')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({
        name: 'JwtTokenInvalid',
        message: `invalid JWT token: ${credential}`,
      })
    })
  })

  /*
  describe('Credentials in signed cookie with prefix Options', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use(
      '/auth-with-keys/*',
      jwk({
        keys: verify_keys,
        cookie: {
          key: 'cookie_name',
          secret: 'cookie_secret',
          prefixOptions: 'host',
        },
      })
    )

    app.get('/auth-with-keys/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth-with-keys/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const signature = await signCookie(credential, 'cookie_secret')
      const signedCookieValue = `${credential}.${signature}`
      const url = 'http://localhost/auth-with-keys/a'
      const req = new Request(url, {
        headers: new Headers({
          Cookie:
            '__Host-cookie_name=' + signedCookieValue + '; Path=/;',
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
      '/auth-with-keys/*',
      jwk({
        keys: verify_keys,
        cookie: {
          key: 'cookie_name',
          secret: 'cookie_secret',
        },
      })
    )

    app.get('/auth-with-keys/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth-with-keys/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const signature = await signCookie(credential, 'cookie_secret')
      const signedCookieValue = `${credential}.${signature}`
      const url = 'http://localhost/auth-with-keys/a'
      const req = new Request(url, {
        headers: new Headers({
          Cookie:
            'cookie_name=' + signedCookieValue,
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
      '/auth-with-keys/*',
      jwk({
        keys: verify_keys,
        cookie: {
          key: 'cookie_name',
          prefixOptions: 'host',
        },
      })
    )

    app.get('/auth-with-keys/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth-with-keys/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const url = 'http://localhost/auth-with-keys/a'
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
      '/auth-with-keys/*',
      jwk({
        keys: verify_keys,
        cookie: {
          key: 'cookie_name',
        },
      })
    )

    app.get('/auth-with-keys/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should not authorize', async () => {
      const req = new Request('http://localhost/auth-with-keys/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const url = 'http://localhost/auth-with-keys/a'
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
  */
})
