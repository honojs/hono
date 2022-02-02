import { Hono } from '../../hono'
import { basicAuth } from './basic-auth'

describe('Basic Auth by Middleware', () => {
  const crypto = global.crypto
  beforeAll(() => {
    global.crypto = require('crypto').webcrypto
  })
  afterAll(() => {
    global.crypto = crypto
  })

  const app = new Hono()

  const username = 'hono-user-a'
  const password = 'hono-password-a'
  const unicodePassword = '炎'

  app.use(
    '/auth/*',
    basicAuth({
      username,
      password,
    })
  )

  app.use(
    '/auth-unicode/*',
    basicAuth({
      username: username,
      password: unicodePassword,
    })
  )

  app.get('/auth/*', () => new Response('auth'))
  app.get('/auth-unicode/*', () => new Response('auth'))

  it('Unauthorized', async () => {
    const req = new Request('http://localhost/auth/a')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Authorizated', async () => {
    const credential = Buffer.from(username + ':' + password).toString('base64')

    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })

  it('Authorizated Unicode', async () => {
    const credential = Buffer.from(username + ':' + unicodePassword).toString('base64')

    const req = new Request('http://localhost/auth-unicode/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })
})
