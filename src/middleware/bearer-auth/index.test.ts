import { Hono } from '../../hono'
import { bearerAuth } from '.'

describe('Bearer Auth by Middleware', () => {
  let app: Hono
  let handlerExecuted: boolean
  let token: string
  let tokens: string[]

  beforeEach(async () => {
    app = new Hono()
    handlerExecuted = false
    token = 'abcdefg12345-._~+/='
    tokens = ['abcdefg12345-._~+/=', 'alternative']

    app.use('/auth/*', bearerAuth({ token }))
    app.use('/auth/*', async (c, next) => {
      c.header('x-custom', 'foo')
      await next()
    })
    app.get('/auth/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use('/authBot/*', bearerAuth({ token, prefix: 'Bot' }))
    app.get('/authBot/*', (c) => {
      handlerExecuted = true
      return c.text('auth bot')
    })

    app.use('/apiKey/*', bearerAuth({ token, prefix: '', headerName: 'X-Api-Key' }))
    app.get('/apiKey/*', (c) => {
      handlerExecuted = true
      return c.text('auth apiKey')
    })

    app.use('/nested/*', async (c, next) => {
      const auth = bearerAuth({ token })
      return auth(c, next)
    })
    app.get('/nested/*', (c) => {
      handlerExecuted = true
      return c.text('auth nested')
    })

    app.use('/auths/*', bearerAuth({ token: tokens }))
    app.get('/auths/*', (c) => {
      handlerExecuted = true
      return c.text('auths')
    })

    app.use(
      '/auth-verify-token/*',
      bearerAuth({
        verifyToken: async (token, c) => {
          return c.req.path === '/auth-verify-token' && token === 'dynamic-token'
        },
      })
    )
    app.get('/auth-verify-token/*', (c) => {
      handlerExecuted = true
      return c.text('auth-verify-token')
    })

    app.use('/auth-custom-header/*', bearerAuth({ token: tokens, headerName: 'X-Auth' }))
    app.get('/auth-custom-header/*', (c) => {
      handlerExecuted = true
      return c.text('auth-custom-header')
    })

    app.use(
      '/auth-custom-no-authentication-header-wwwAuthenticateHeader-string/*',
      bearerAuth({
        token: tokens,
        noAuthenticationHeader: {
          wwwAuthenticateHeader: 'Bearer error="Unauthorized",error_description="Unauthorized"',
        },
      })
    )
    app.get('/auth-custom-no-authentication-header-wwwAuthenticateHeader-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-no-authentication-header-wwwAuthenticateHeader-object/*',
      bearerAuth({
        token: tokens,
        noAuthenticationHeader: {
          wwwAuthenticateHeader: {
            error: 'Unauthorized',
            error_description: 'Unauthorized',
          },
        },
      })
    )
    app.get('/auth-custom-no-authentication-header-wwwAuthenticateHeader-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-no-authentication-header-wwwAuthenticateHeader-function-string/*',
      bearerAuth({
        token: tokens,
        noAuthenticationHeader: {
          wwwAuthenticateHeader: () =>
            'Bearer error="Unauthorized",error_description="Unauthorized"',
        },
      })
    )
    app.get(
      '/auth-custom-no-authentication-header-wwwAuthenticateHeader-function-string/*',
      (c) => {
        handlerExecuted = true
        return c.text('auth')
      }
    )

    app.use(
      '/auth-custom-no-authentication-header-wwwAuthenticateHeader-function-object/*',
      bearerAuth({
        token: tokens,
        noAuthenticationHeader: {
          wwwAuthenticateHeader: () => ({
            error: 'Unauthorized',
            error_description: 'Unauthorized',
          }),
        },
      })
    )
    app.get(
      '/auth-custom-no-authentication-header-wwwAuthenticateHeader-function-object/*',
      (c) => {
        handlerExecuted = true
        return c.text('auth')
      }
    )

    app.use(
      '/auth-custom-no-authentication-header-message-string/*',
      bearerAuth({
        token,
        noAuthenticationHeader: { message: 'Custom no authentication header message as string' },
      })
    )
    app.get('/auth-custom-no-authentication-header-message-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-no-authentication-header-message-object/*',
      bearerAuth({
        token,
        noAuthenticationHeader: {
          message: { message: 'Custom no authentication header message as object' },
        },
      })
    )
    app.get('/auth-custom-no-authentication-header-message-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-no-authentication-header-message-function-string/*',
      bearerAuth({
        token,
        noAuthenticationHeader: {
          message: () => 'Custom no authentication header message as function string',
        },
      })
    )
    app.get('/auth-custom-no-authentication-header-message-function-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-no-authentication-header-message-function-object/*',
      bearerAuth({
        token,
        noAuthenticationHeader: {
          message: () => ({
            message: 'Custom no authentication header message as function object',
          }),
        },
      })
    )
    app.get('/auth-custom-no-authentication-header-message-function-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-string/*',
      bearerAuth({
        token: tokens,
        invalidAuthenticationHeader: {
          wwwAuthenticateHeader: 'Bearer error="Unauthorized",error_description="Unauthorized"',
        },
      })
    )
    app.get('/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-object/*',
      bearerAuth({
        token: tokens,
        invalidAuthenticationHeader: {
          wwwAuthenticateHeader: {
            error: 'Unauthorized',
            error_description: 'Unauthorized',
          },
        },
      })
    )
    app.get('/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-function-string/*',
      bearerAuth({
        token: tokens,
        invalidAuthenticationHeader: {
          wwwAuthenticateHeader: () =>
            'Bearer error="Unauthorized",error_description="Unauthorized"',
        },
      })
    )
    app.get(
      '/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-function-string/*',
      (c) => {
        handlerExecuted = true
        return c.text('auth')
      }
    )

    app.use(
      '/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-function-object/*',
      bearerAuth({
        token: tokens,
        invalidAuthenticationHeader: {
          wwwAuthenticateHeader: () => ({
            error: 'Unauthorized',
            error_description: 'Unauthorized',
          }),
        },
      })
    )
    app.get(
      '/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-function-object/*',
      (c) => {
        handlerExecuted = true
        return c.text('auth')
      }
    )

    app.use(
      '/auth-custom-invalid-authentication-header-message-string/*',
      bearerAuth({
        token,
        invalidAuthenticationHeader: {
          message: 'Custom invalid authentication header message as string',
        },
      })
    )
    app.get('/auth-custom-invalid-authentication-header-message-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-authentication-header-message-object/*',
      bearerAuth({
        token,
        invalidAuthenticationHeader: {
          message: {
            message: 'Custom invalid authentication header message as object',
          },
        },
      })
    )
    app.get('/auth-custom-invalid-authentication-header-message-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-authentication-header-message-function-string/*',
      bearerAuth({
        token,
        invalidAuthenticationHeader: {
          message: () => 'Custom invalid authentication header message as function string',
        },
      })
    )
    app.get('/auth-custom-invalid-authentication-header-message-function-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-authentication-header-message-function-object/*',
      bearerAuth({
        token,
        invalidAuthenticationHeader: {
          message: () => ({
            message: 'Custom invalid authentication header message as function object',
          }),
        },
      })
    )
    app.get('/auth-custom-invalid-authentication-header-message-function-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-token-wwwAuthenticateHeader-string/*',
      bearerAuth({
        token: tokens,
        invalidToken: {
          wwwAuthenticateHeader: 'Bearer error="Unauthorized",error_description="Unauthorized"',
        },
      })
    )
    app.get('/auth-custom-invalid-token-wwwAuthenticateHeader-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-token-wwwAuthenticateHeader-object/*',
      bearerAuth({
        token: tokens,
        invalidToken: {
          wwwAuthenticateHeader: {
            error: 'Unauthorized',
            error_description: 'Unauthorized',
          },
        },
      })
    )
    app.get('/auth-custom-invalid-token-wwwAuthenticateHeader-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-token-wwwAuthenticateHeader-function-string/*',
      bearerAuth({
        token: tokens,
        invalidToken: {
          wwwAuthenticateHeader: () =>
            'Bearer error="Unauthorized",error_description="Unauthorized"',
        },
      })
    )
    app.get('/auth-custom-invalid-token-wwwAuthenticateHeader-function-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-token-wwwAuthenticateHeader-function-object/*',
      bearerAuth({
        token: tokens,
        invalidToken: {
          wwwAuthenticateHeader: () => ({
            error: 'Unauthorized',
            error_description: 'Unauthorized',
          }),
        },
      })
    )
    app.get('/auth-custom-invalid-token-wwwAuthenticateHeader-function-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-token-message-string/*',
      bearerAuth({
        token,
        invalidToken: { message: 'Custom invalid token message as string' },
      })
    )
    app.get('/auth-custom-invalid-token-message-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-token-message-object/*',
      bearerAuth({
        token,
        invalidToken: { message: { message: 'Custom invalid token message as object' } },
      })
    )
    app.get('/auth-custom-invalid-token-message-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-token-message-function-string/*',
      bearerAuth({
        token,
        invalidToken: { message: () => 'Custom invalid token message as function string' },
      })
    )
    app.get('/auth-custom-invalid-token-message-function-string/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })

    app.use(
      '/auth-custom-invalid-token-message-function-object/*',
      bearerAuth({
        token,
        invalidToken: {
          message: () => ({
            message: 'Custom invalid token message as function object',
          }),
        },
      })
    )
    app.get('/auth-custom-invalid-token-message-function-object/*', (c) => {
      handlerExecuted = true
      return c.text('auth')
    })
  })

  it('Should authorize', async () => {
    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', 'Bearer abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
    expect(await res.text()).toBe('auth')
    expect(res.headers.get('x-custom')).toBe('foo')
  })

  it.each([['bearer'], ['BEARER'], ['BeArEr']])(
    'Should authorize - prefix is case-insensitive: %s',
    async (prefix) => {
      const req = new Request('http://localhost/auth/a')
      req.headers.set('Authorization', `${prefix} ${token}`)
      const res = await app.request(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(handlerExecuted).toBeTruthy()
    }
  )

  it('Should not authorize - no authorization header', async () => {
    const req = new Request('http://localhost/auth/a')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('Unauthorized')
    expect(res.headers.get('x-custom')).toBeNull()
  })

  it('Should not authorize - invalid request', async () => {
    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', 'Beare abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(handlerExecuted).toBeFalsy()
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Bad Request')
    expect(res.headers.get('x-custom')).toBeNull()
  })

  it('Should not authorize - invalid token', async () => {
    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
    expect(res.headers.get('x-custom')).toBeNull()
  })

  it('Should not authorize - token is case-sensitive', async () => {
    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', `Bearer ${token.toUpperCase()}`)
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should authorize', async () => {
    const req = new Request('http://localhost/authBot/a')
    req.headers.set('Authorization', 'Bot abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
    expect(await res.text()).toBe('auth bot')
  })

  it('Should not authorize - invalid request', async () => {
    const req = new Request('http://localhost/authBot/a')
    req.headers.set('Authorization', 'Bearer abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(handlerExecuted).toBeFalsy()
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Bad Request')
  })

  it('Should authorize', async () => {
    const req = new Request('http://localhost/apiKey/a')
    req.headers.set('X-Api-Key', 'abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
    expect(await res.text()).toBe('auth apiKey')
  })

  it('Should not authorize - invalid request', async () => {
    const req = new Request('http://localhost/apiKey/a')
    req.headers.set('Authorization', 'Bearer abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(handlerExecuted).toBeFalsy()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should authorize - nested', async () => {
    const req = new Request('http://localhost/nested/a')
    req.headers.set('Authorization', 'Bearer abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
    expect(await res.text()).toBe('auth nested')
  })

  it('Should not authorize - nested', async () => {
    const req = new Request('http://localhost/nested/a')
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(handlerExecuted).toBeFalsy()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should authorize - with any token in list', async () => {
    const req1 = new Request('http://localhost/auths/a')
    req1.headers.set('Authorization', 'Bearer abcdefg12345-._~+/=')
    const res1 = await app.request(req1)
    expect(res1).not.toBeNull()
    expect(res1.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
    expect(await res1.text()).toBe('auths')

    const req2 = new Request('http://localhost/auths/a')
    req2.headers.set('Authorization', 'Bearer alternative')
    const res2 = await app.request(req2)
    expect(res2).not.toBeNull()
    expect(res2.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
    expect(await res2.text()).toBe('auths')
  })

  it('Should authorize - verifyToken option', async () => {
    const res = await app.request('/auth-verify-token', {
      headers: { Authorization: 'Bearer dynamic-token' },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
    expect(await res.text()).toBe('auth-verify-token')
  })

  it('Should not authorize - verifyToken option', async () => {
    const res = await app.request('/auth-verify-token', {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    expect(res).not.toBeNull()
    expect(handlerExecuted).toBeFalsy()
    expect(res.status).toBe(401)
  })

  it('Should authorize - custom header', async () => {
    const req = new Request('http://localhost/auth-custom-header/a')
    req.headers.set('X-Auth', 'Bearer abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
    expect(await res.text()).toBe('auth-custom-header')
  })

  it('Should not authorize - custom header', async () => {
    const req = new Request('http://localhost/auth-custom-header/a')
    req.headers.set('X-Auth', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(handlerExecuted).toBeFalsy()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should not authorize - custom no authorization header wwwAuthenticateHeader as string', async () => {
    const req = new Request(
      'http://localhost/auth-custom-no-authentication-header-wwwAuthenticateHeader-string'
    )
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom no authorization header wwwAuthenticateHeader as object', async () => {
    const req = new Request(
      'http://localhost/auth-custom-no-authentication-header-wwwAuthenticateHeader-object'
    )
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom no authorization header wwwAuthenticateHeader as function string', async () => {
    const req = new Request(
      'http://localhost/auth-custom-no-authentication-header-wwwAuthenticateHeader-function-string'
    )
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom no authorization header wwwAuthenticateHeader as function object', async () => {
    const req = new Request(
      'http://localhost/auth-custom-no-authentication-header-wwwAuthenticateHeader-function-object'
    )
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom no authorization header message as string', async () => {
    const req = new Request('http://localhost/auth-custom-no-authentication-header-message-string')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('Custom no authentication header message as string')
  })

  it('Should not authorize - custom no authorization header message as object', async () => {
    const req = new Request('http://localhost/auth-custom-no-authentication-header-message-object')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(res.headers.get('Content-Type')).toMatch('application/json')
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('{"message":"Custom no authentication header message as object"}')
  })

  it('Should not authorize - custom no authorization header message as function string', async () => {
    const req = new Request(
      'http://localhost/auth-custom-no-authentication-header-message-function-string'
    )
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('Custom no authentication header message as function string')
  })

  it('Should not authorize - custom no authorization header message as function object', async () => {
    const req = new Request(
      'http://localhost/auth-custom-no-authentication-header-message-function-object'
    )
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(res.headers.get('Content-Type')).toMatch('application/json')
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe(
      '{"message":"Custom no authentication header message as function object"}'
    )
  })

  it('Should not authorize - custom invalid authentication header wwwAuthenticateHeader as string', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-string'
    )
    req.headers.set('Authorization', 'Beare abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(400)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom invalid authentication header wwwAuthenticateHeader as object', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-object'
    )
    req.headers.set('Authorization', 'Beare abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(400)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom invalid authentication header wwwAuthenticateHeader as function string', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-function-string'
    )
    req.headers.set('Authorization', 'Beare abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(400)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom invalid authentication header wwwAuthenticateHeader as function object', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-authentication-header-wwwAuthenticateHeader-function-object'
    )
    req.headers.set('Authorization', 'Beare abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(400)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom invalid authentication header message as string', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-authentication-header-message-string'
    )
    req.headers.set('Authorization', 'Beare abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(400)
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('Custom invalid authentication header message as string')
  })

  it('Should not authorize - custom invalid authentication header message as object', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-authentication-header-message-object'
    )
    req.headers.set('Authorization', 'Beare abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(400)
    expect(res.headers.get('Content-Type')).toMatch('application/json')
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe(
      '{"message":"Custom invalid authentication header message as object"}'
    )
  })

  it('Should not authorize - custom invalid authentication header message as function string', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-authentication-header-message-function-string'
    )
    req.headers.set('Authorization', 'Beare abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(400)
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('Custom invalid authentication header message as function string')
  })

  it('Should not authorize - custom invalid authentication header message as function object', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-authentication-header-message-function-object'
    )
    req.headers.set('Authorization', 'Beare abcdefg12345-._~+/=')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(400)
    expect(res.headers.get('Content-Type')).toMatch('application/json')
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe(
      '{"message":"Custom invalid authentication header message as function object"}'
    )
  })

  it('Should not authorize - custom invalid token wwwAuthenticateHeader as string', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-token-wwwAuthenticateHeader-string'
    )
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom invalid token wwwAuthenticateHeader as object', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-token-wwwAuthenticateHeader-object'
    )
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom invalid token wwwAuthenticateHeader as function string', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-token-wwwAuthenticateHeader-function-string'
    )
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom invalid token wwwAuthenticateHeader as function object', async () => {
    const req = new Request(
      'http://localhost/auth-custom-invalid-token-wwwAuthenticateHeader-function-object'
    )
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="Unauthorized",error_description="Unauthorized"'
    )
  })

  it('Should not authorize - custom invalid token message as string', async () => {
    const req = new Request('http://localhost/auth-custom-invalid-token-message-string')
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('Custom invalid token message as string')
  })

  it('Should not authorize - custom invalid token message as object', async () => {
    const req = new Request('http://localhost/auth-custom-invalid-token-message-object')
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(res.headers.get('Content-Type')).toMatch('application/json')
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('{"message":"Custom invalid token message as object"}')
  })

  it('Should not authorize - custom invalid token message as function string', async () => {
    const req = new Request('http://localhost/auth-custom-invalid-token-message-function-string')
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('Custom invalid token message as function string')
  })

  it('Should not authorize - custom invalid token message as function object', async () => {
    const req = new Request('http://localhost/auth-custom-invalid-token-message-function-object')
    req.headers.set('Authorization', 'Bearer invalid-token')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(res.headers.get('Content-Type')).toMatch('application/json')
    expect(handlerExecuted).toBeFalsy()
    expect(await res.text()).toBe('{"message":"Custom invalid token message as function object"}')
  })
})

describe('Bearer Auth with prefix containing regex metacharacters', () => {
  let app: Hono
  let handlerExecuted: boolean
  const token = 'testtoken123'

  beforeEach(() => {
    app = new Hono()
    handlerExecuted = false
  })

  it('Should not throw when prefix contains regex metacharacters', () => {
    expect(() => {
      bearerAuth({ token, prefix: 'Bearer (v2)' })
    }).not.toThrow()
  })

  it('Should authorize with prefix containing parentheses', async () => {
    app.use('/*', bearerAuth({ token, prefix: 'Bearer(v2)' }))
    app.get('/*', (c) => {
      handlerExecuted = true
      return c.text('ok')
    })

    const req = new Request('http://localhost/')
    req.headers.set('Authorization', `Bearer(v2) ${token}`)
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
  })

  it('Should authorize with prefix containing dots and plus signs', async () => {
    app.use('/*', bearerAuth({ token, prefix: 'X.Auth+v2' }))
    app.get('/*', (c) => {
      handlerExecuted = true
      return c.text('ok')
    })

    const req = new Request('http://localhost/')
    req.headers.set('Authorization', `X.Auth+v2 ${token}`)
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
  })

  it('Should not match when prefix metacharacters are interpreted as regex', async () => {
    app.use('/*', bearerAuth({ token, prefix: 'X.Y' }))
    app.get('/*', (c) => {
      handlerExecuted = true
      return c.text('ok')
    })

    const req = new Request('http://localhost/')
    req.headers.set('Authorization', `XZY ${token}`)
    const res = await app.request(req)
    expect(res.status).toBe(400)
    expect(handlerExecuted).toBeFalsy()
  })
})
