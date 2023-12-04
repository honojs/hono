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
})
