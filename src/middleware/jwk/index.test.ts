import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { setSignedCookie } from '../../helper/cookie'
import { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import { encodeBase64Url } from '../../utils/encode'
import { Jwt } from '../../utils/jwt'
import type { HonoJsonWebKey } from '../../utils/jwt/jws'
import { signing } from '../../utils/jwt/jws'
import { verifyFromJwks } from '../../utils/jwt/jwt'
import type { JWTPayload } from '../../utils/jwt/types'
import { utf8Encoder } from '../../utils/jwt/utf8'
import * as test_keys from './keys.test.json'
import { jwk } from '.'

const verify_keys = test_keys.public_keys

describe('JWK', () => {
  const server = setupServer(
    http.get('http://localhost/.well-known/jwks.json', () => {
      return HttpResponse.json({ keys: verify_keys })
    }),
    http.get('http://localhost/.well-known/missing-jwks.json', () => {
      return HttpResponse.json({})
    }),
    http.get('http://localhost/.well-known/bad-jwks.json', () => {
      return HttpResponse.json({ keys: 'bad-keys' })
    }),
    http.get('http://localhost/.well-known/404-jwks.json', () => {
      return HttpResponse.text('Not Found', { status: 404 })
    })
  )
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('verifyFromJwks', () => {
    it('Should throw error on missing options', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      await expect(verifyFromJwks(credential, {})).rejects.toThrow(
        'verifyFromJwks requires options for either "keys" or "jwks_uri" or both'
      )
    })
  })

  describe('options.allow_anon = true', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use('/backend-auth-or-anon/*', jwk({ keys: verify_keys, allow_anon: true }))

    app.get('/backend-auth-or-anon/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload ?? { message: 'hello anon' })
    })

    it('Should skip JWK if no token is present', async () => {
      const req = new Request('http://localhost/backend-auth-or-anon/a')
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello anon' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize if token is present', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/backend-auth-or-anon/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should not authorize if bad token is present', async () => {
      const invalidToken =
        'ssyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
      const url = 'http://localhost/backend-auth-or-anon/a'
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
  })

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
          const response = await fetch('http://localhost/.well-known/jwks.json')
          const data = await response.json()
          return data.keys
        },
      })
    )
    app.use(
      '/auth-with-jwks_uri/*',
      jwk({
        jwks_uri: 'http://localhost/.well-known/jwks.json',
      })
    )
    app.use(
      '/auth-with-keys-and-jwks_uri/*',
      jwk({
        keys: verify_keys,
        jwks_uri: () => 'http://localhost/.well-known/jwks.json',
      })
    )
    app.use(
      '/auth-with-missing-jwks_uri/*',
      jwk({
        jwks_uri: 'http://localhost/.well-known/missing-jwks.json',
      })
    )
    app.use(
      '/auth-with-404-jwks_uri/*',
      jwk({
        jwks_uri: 'http://localhost/.well-known/404-jwks.json',
      })
    )
    app.use(
      '/auth-with-bad-jwks_uri/*',
      jwk({
        jwks_uri: 'http://localhost/.well-known/bad-jwks.json',
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
    app.get('/auth-with-keys-and-jwks_uri/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-missing-jwks_uri/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-404-jwks_uri/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-bad-jwks_uri/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should throw an error if the middleware is missing both keys and jwks_uri (empty)', async () => {
      expect(() => app.use('/auth-with-empty-middleware/*', jwk({}))).toThrow(
        'JWK auth middleware requires options for either "keys" or "jwks_uri"'
      )
    })

    it('Should throw an error when crypto.subtle is missing', async () => {
      const subtleSpy = vi.spyOn(global.crypto, 'subtle', 'get').mockReturnValue({
        importKey: undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      expect(() => app.use('/auth-with-bad-env/*', jwk({ keys: verify_keys }))).toThrow()
      subtleSpy.mockRestore()
    })

    it('Should return a server error if options.jwks_uri returns a 404', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-404-jwks_uri/a')
      req.headers.set('Authorization', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(500)
    })

    it('Should return a server error if the remotely fetched keys from options.jwks_uri are missing', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-missing-jwks_uri/a')
      req.headers.set('Authorization', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(500)
    })

    it('Should return a server error if the remotely fetched keys from options.jwks_uri are malformed', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-bad-jwks_uri/a')
      req.headers.set('Authorization', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(500)
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
      expect(res.status).toBe(200)
    })

    it('Should not authorize a token without header', async () => {
      const encodeJwtPart = (part: unknown): string =>
        encodeBase64Url(utf8Encoder.encode(JSON.stringify(part))).replace(/=/g, '')
      const encodeSignaturePart = (buf: ArrayBufferLike): string =>
        encodeBase64Url(buf).replace(/=/g, '')
      const jwtSignWithoutHeader = async (payload: JWTPayload, privateKey: HonoJsonWebKey) => {
        const encodedPayload = encodeJwtPart(payload)
        const signaturePart = await signing(
          privateKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          privateKey.alg as any,
          utf8Encoder.encode(encodedPayload)
        )
        const signature = encodeSignaturePart(signaturePart)
        return `${encodedPayload}.${signature}`
      }
      const credential = await jwtSignWithoutHeader(
        { message: 'hello world' },
        test_keys.private_keys[1]
      )
      const req = new Request('http://localhost/auth-with-keys/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
    })

    it('Should not authorize a token with missing "kid" in header', async () => {
      const encodeJwtPart = (part: unknown): string =>
        encodeBase64Url(utf8Encoder.encode(JSON.stringify(part))).replace(/=/g, '')
      const encodeSignaturePart = (buf: ArrayBufferLike): string =>
        encodeBase64Url(buf).replace(/=/g, '')
      const jwtSignWithoutKid = async (payload: JWTPayload, privateKey: HonoJsonWebKey) => {
        const encodedPayload = encodeJwtPart(payload)
        const encodedHeader = encodeJwtPart({ alg: privateKey.alg, typ: 'JWT' })
        const partialToken = `${encodedHeader}.${encodedPayload}`
        const signaturePart = await signing(
          privateKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          privateKey.alg as any,
          utf8Encoder.encode(partialToken)
        )
        const signature = encodeSignaturePart(signaturePart)
        return `${partialToken}.${signature}`
      }
      const credential = await jwtSignWithoutKid(
        { message: 'hello world' },
        test_keys.private_keys[1]
      )
      const req = new Request('http://localhost/auth-with-keys/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
    })

    it('Should not authorize a token with invalid "kid" in header', async () => {
      const copy = structuredClone(test_keys.private_keys[1])
      copy.kid = 'invalid-kid'
      const credential = await Jwt.sign({ message: 'hello world' }, copy)
      const req = new Request('http://localhost/auth-with-keys/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
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

    it('Should authorize from keys remotely fetched from options.jwks_uri', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-jwks_uri/a')
      req.headers.set('Authorization', `Basic ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize from keys and hard-coded and remotely fetched from options.jwks_uri', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request('http://localhost/auth-with-keys-and-jwks_uri/a')
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

  describe('Credentials in custom header', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()

    app.use('/auth-with-keys/*', jwk({ keys: verify_keys, headerName: 'x-custom-auth-header' }))

    app.get('/auth-with-keys/*', (c) => {
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

    it('Should not authorize even if default authorization header present', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])

      const req = new Request('http://localhost/auth-with-keys/a')
      req.headers.set('Authorization', `Bearer ${credential}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(handlerExecuted).toBeFalsy()
    })

    it('Should authorize', async () => {
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[1])

      const req = new Request('http://localhost/auth-with-keys/a')
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

    app.use('/auth-with-keys/*', jwk({ keys: verify_keys, cookie: 'access_token' }))
    app.use('/auth-with-keys-unicode/*', jwk({ keys: verify_keys, cookie: 'access_token' }))
    app.use(
      '/auth-with-keys-prefixed/*',
      jwk({ keys: verify_keys, cookie: { key: 'access_token', prefixOptions: 'host' } })
    )
    app.use(
      '/auth-with-keys-unprefixed/*',
      jwk({ keys: verify_keys, cookie: { key: 'access_token' } })
    )

    app.get('/auth-with-keys/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-keys-prefixed/*', (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-keys-unprefixed/*', (c) => {
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

    it('Should authorize cookie from a static array passed to options.keys', async () => {
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

    it('Should authorize prefixed cookie from a static array passed to options.keys', async () => {
      const url = 'http://localhost/auth-with-keys-prefixed/a'
      const credential = await Jwt.sign({ message: 'hello world' }, test_keys.private_keys[0])
      const req = new Request(url, {
        headers: new Headers({
          Cookie: `__Host-access_token=${credential}`,
        }),
      })
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(await res.json()).toEqual({ message: 'hello world' })
      expect(res.status).toBe(200)
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize unprefixed cookie from a static array passed to options.keys', async () => {
      const url = 'http://localhost/auth-with-keys-unprefixed/a'
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

  describe('Credentials in a signed cookie', () => {
    let handlerExecuted: boolean

    beforeEach(() => {
      handlerExecuted = false
    })

    const app = new Hono()
    const test_secret = 'Shhh'

    app.use(
      '/auth-with-signed-cookie/*',
      jwk({ keys: verify_keys, cookie: { key: 'access_token', secret: test_secret } })
    )
    app.use(
      '/auth-with-signed-with-prefix-options-cookie/*',
      jwk({
        keys: verify_keys,
        cookie: { key: 'access_token', secret: test_secret, prefixOptions: 'host' },
      })
    )

    app.get('/sign-cookie', async (c) => {
      const credential = await Jwt.sign(
        { message: 'signed hello world' },
        test_keys.private_keys[0]
      )
      await setSignedCookie(c, 'access_token', credential, test_secret)
      return c.text('OK')
    })
    app.get('/sign-cookie-with-prefix', async (c) => {
      const credential = await Jwt.sign(
        { message: 'signed hello world' },
        test_keys.private_keys[0]
      )
      await setSignedCookie(c, 'access_token', credential, test_secret, { prefix: 'host' })
      return c.text('OK')
    })
    app.get('/auth-with-signed-cookie/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })
    app.get('/auth-with-signed-with-prefix-options-cookie/*', async (c) => {
      handlerExecuted = true
      const payload = c.get('jwtPayload')
      return c.json(payload)
    })

    it('Should authorize signed cookie', async () => {
      const url = 'http://localhost/auth-with-signed-cookie/a'
      const sign_res = await app.request('http://localhost/sign-cookie')
      const cookieHeader = sign_res.headers.get('Set-Cookie') as string
      expect(cookieHeader).not.toBeNull()
      const req = new Request(url)
      req.headers.set('Cookie', cookieHeader)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'signed hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should authorize prefixed signed cookie', async () => {
      const url = 'http://localhost/auth-with-signed-with-prefix-options-cookie/a'
      const sign_res = await app.request('http://localhost/sign-cookie-with-prefix')
      const cookieHeader = sign_res.headers.get('Set-Cookie') as string
      expect(cookieHeader).not.toBeNull()
      const req = new Request(url)
      req.headers.set('Cookie', cookieHeader)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'signed hello world' })
      expect(handlerExecuted).toBeTruthy()
    })

    it('Should not authorize an unsigned cookie', async () => {
      const url = 'http://localhost/auth-with-signed-cookie/a'
      const credential = await Jwt.sign(
        { message: 'unsigned hello world' },
        test_keys.private_keys[0]
      )
      const unsignedCookie = `access_token=${credential}`
      const req = new Request(url)
      req.headers.set('Cookie', unsignedCookie)
      const res = await app.request(req)
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
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
})
