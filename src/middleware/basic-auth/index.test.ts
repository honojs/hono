import { SHA256 } from 'crypto-js'
import { Hono } from '../../hono'
import { basicAuth } from '.'

describe('Basic Auth by Middleware', () => {
  let handlerExecuted: boolean

  beforeEach(() => {
    handlerExecuted = false
  })

  const app = new Hono()

  const username = 'hono-user-a'
  const password = 'hono-password-a'
  const unicodePassword = '炎'

  const usernameB = 'hono-user-b'
  const passwordB = 'hono-password-b'

  const usernameC = 'hono-user-c'
  const passwordC = 'hono-password-c'

  app.use(
    '/auth/*',
    basicAuth({
      username,
      password,
    })
  )

  app.use('/auth/*', async (c, next) => {
    c.header('x-custom', 'foo')
    await next()
  })

  app.use(
    '/auth-unicode/*',
    basicAuth({
      username: username,
      password: unicodePassword,
    })
  )

  app.use(
    '/auth-multi/*',
    basicAuth(
      {
        username: usernameB,
        password: passwordB,
      },
      {
        username: usernameC,
        password: passwordC,
      }
    )
  )

  app.use(
    '/auth-override-func/*',
    basicAuth({
      username: username,
      password: password,
      hashFunction: (data: string) => SHA256(data).toString(),
    })
  )

  app.use('/nested/*', async (c, next) => {
    const auth = basicAuth({ username: username, password: password })
    return auth(c, next)
  })

  app.use('/verify-user/*', async (c, next) => {
    const auth = basicAuth({
      verifyUser: (username, password, c) => {
        return (
          c.req.path === '/verify-user' &&
          username === 'dynamic-user' &&
          password === 'hono-password'
        )
      },
    })
    return auth(c, next)
  })

  app.get('/auth/*', (c) => {
    handlerExecuted = true
    return c.text('auth')
  })
  app.get('/auth-unicode/*', (c) => {
    handlerExecuted = true
    return c.text('auth')
  })
  app.get('/auth-multi/*', (c) => {
    handlerExecuted = true
    return c.text('auth')
  })
  app.get('/auth-override-func/*', (c) => {
    handlerExecuted = true
    return c.text('auth')
  })

  app.get('/nested/*', (c) => {
    handlerExecuted = true
    return c.text('nested')
  })

  app.get('/verify-user', (c) => {
    handlerExecuted = true
    return c.text('verify-user')
  })

  it('should not authorize without credentials', async () => {
    const req = new Request('http://localhost/auth/a')
    const res = await app.request(req)

    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(res.headers.get('x-custom')).toBeNull()
    expect(handlerExecuted).toBeFalsy()
  })

  it('should authorize with valid credentials', async () => {
    const credential = Buffer.from(username + ':' + password).toString('base64')

    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', `Basic ${credential}`)

    const res = await app.request(req)

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('x-custom')).toBe('foo')
    expect(handlerExecuted).toBeTruthy()
  })

  it('should authorize with unicode password', async () => {
    const credential = Buffer.from(username + ':' + unicodePassword).toString('base64')

    const req = new Request('http://localhost/auth-unicode/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
  })

  it('should authorize with multiple users', async () => {
    let credential = Buffer.from(usernameB + ':' + passwordB).toString('base64')

    let req = new Request('http://localhost/auth-multi/b')
    req.headers.set('Authorization', `Basic ${credential}`)

    let res = await app.request(req)

    expect(handlerExecuted).toBeTruthy()
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')

    credential = Buffer.from(usernameC + ':' + passwordC).toString('base64')
    handlerExecuted = false
    req = new Request('http://localhost/auth-multi/c')
    req.headers.set('Authorization', `Basic ${credential}`)

    res = await app.request(req)

    expect(handlerExecuted).toBeTruthy()
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })

  it('should authorize with SHA256 function override', async () => {
    const credential = Buffer.from(username + ':' + password).toString('base64')

    const req = new Request('http://localhost/auth-override-func/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)
    expect(handlerExecuted).toBeTruthy()
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })

  it('should authorize nested routes', async () => {
    const credential = Buffer.from(username + ':' + password).toString('base64')

    const req = new Request('http://localhost/nested')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
  })

  it('should not authorize nested route with invalid credential', async () => {
    const credential = Buffer.from('foo' + ':' + 'bar').toString('base64')

    const req = new Request('http://localhost/nested')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)

    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
  })

  it('should authorize with verifyUser function', async () => {
    const credential = Buffer.from('dynamic-user' + ':' + 'hono-password').toString('base64')

    const req = new Request('http://localhost/verify-user')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(handlerExecuted).toBeTruthy()
  })

  it('should not authorize with verifyUser function when creandetials are invalid', async () => {
    const credential = Buffer.from('foo' + ':' + 'bar').toString('base64')

    const req = new Request('http://localhost/verify-user')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)

    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(handlerExecuted).toBeFalsy()
  })
})
