import { Hono } from '@/hono'
import { jwt } from '@/middleware/jwt'

describe('Jwt Auth by Middleware', () => {
  const crypto = global.crypto
  beforeAll(() => {
    global.crypto = require('crypto').webcrypto
  })
  afterAll(() => {
    global.crypto = crypto
  })

  const app = new Hono()

  app.use(
    '/auth/*',
    jwt({ secret: 'a-secret' })
  )

  app.use(
    '/auth-unicode/*',
    jwt({ secret: 'a-secret'})
  )

  app.get('/auth/*', () => new Response('auth'))
  app.get('/auth-unicode/*', () => new Response('auth'))

  it('Should not authorize', async () => {
    const req = new Request('http://localhost/auth/a')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should authorize', async () => {
    const credential = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', `Bearer ${credential}`)
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })

  it('Should authorize Unicode', async () => {
    const credential = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

    const req = new Request('http://localhost/auth-unicode/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })

  it('Should authorize Unicode', async () => {
    const invalidToken = 'ssyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'

    const req = new Request('http://localhost/auth-unicode/a')
    req.headers.set('Authorization', `Basic ${invalidToken}`)
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
  })
})
