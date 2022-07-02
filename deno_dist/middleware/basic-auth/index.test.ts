import { Buffer } from "https://deno.land/std@0.85.0/node/buffer.ts";
import { SHA256 } from 'crypto-js DENOIFY: DEPENDENCY UNMET (DEV DEPENDENCY)'
import { Hono } from '../../hono.ts'
import { basicAuth } from './index.ts'

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
    await auth(c, next)
  })

  app.get('/auth/*', () => new Response('auth'))
  app.get('/auth-unicode/*', () => new Response('auth'))
  app.get('/auth-multi/*', () => new Response('auth'))
  app.get('/auth-override-func/*', () => new Response('auth'))

  app.get('/nested/*', () => new Response('nested'))

  it('Should not authorize', async () => {
    const req = new Request('http://localhost/auth/a')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should authorize', async () => {
    const credential = Buffer.from(username + ':' + password).toString('base64')

    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })

  it('Should authorize Unicode', async () => {
    const credential = Buffer.from(username + ':' + unicodePassword).toString('base64')

    const req = new Request('http://localhost/auth-unicode/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })

  it('Should authorize multiple users', async () => {
    let credential = Buffer.from(usernameB + ':' + passwordB).toString('base64')

    let req = new Request('http://localhost/auth-multi/b')
    req.headers.set('Authorization', `Basic ${credential}`)
    let res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')

    credential = Buffer.from(usernameC + ':' + passwordC).toString('base64')
    req = new Request('http://localhost/auth-multi/c')
    req.headers.set('Authorization', `Basic ${credential}`)
    res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })

  it('Should authorize with sha256 function override', async () => {
    const credential = Buffer.from(username + ':' + password).toString('base64')

    const req = new Request('http://localhost/auth-override-func/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })

  it('Should authorize - nested', async () => {
    const credential = Buffer.from(username + ':' + password).toString('base64')

    const req = new Request('http://localhost/nested')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('nested')
  })

  it('Should not authorize - nested', async () => {
    const credential = Buffer.from('foo' + ':' + 'bar').toString('base64')

    const req = new Request('http://localhost/nested')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })
})
