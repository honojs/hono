import { SHA256 } from 'crypto-js'
import { getRuntimeKey } from '../../src/helper/adapter'
import { Hono } from '../../src/index'
import { basicAuth } from '../../src/middleware/basic-auth'
import { jwt } from '../../src/middleware/jwt'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.fastly = true

const app = new Hono()

describe('Hello World', () => {
  app.get('/', (c) => c.text('Hello! Compute!'))
  app.get('/runtime-name', (c) => {
    return c.text(getRuntimeKey())
  })

  it('Should return 200', async () => {
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello! Compute!')
  })

  it('Should return the correct runtime name', async () => {
    const res = await app.request('http://localhost/runtime-name')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('fastly')
  })
})

describe('Basic Auth Middleware without `hashFunction`', () => {
  const app = new Hono()

  const username = 'hono-user-a'
  const password = 'hono-password-a'
  app.use(
    '/auth/*',
    basicAuth({
      username,
      password,
    })
  )

  app.get('/auth/*', () => new Response('auth'))

  it('Should not authorize, return 401 Response', async () => {
    const req = new Request('http://localhost/auth/a')
    const res = await app.request(req)
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })
})

describe('Basic Auth Middleware with `hashFunction`', () => {
  const app = new Hono()

  const username = 'hono-user-a'
  const password = 'hono-password-a'
  app.use(
    '/auth/*',
    basicAuth({
      username,
      password,
      hashFunction: (m: string) => SHA256(m).toString(),
    })
  )

  app.get('/auth/*', () => new Response('auth'))

  it('Should not authorize, return 401 Response', async () => {
    const req = new Request('http://localhost/auth/a')
    const res = await app.request(req)
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Should authorize, return 200 Response', async () => {
    const credential = 'aG9uby11c2VyLWE6aG9uby1wYXNzd29yZC1h'
    const req = new Request('http://localhost/auth/a')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth')
  })
})

describe('JWT Auth Middleware does not work', () => {
  const app = new Hono()

  // Since nodejs 20 or later, global WebCrypto object becomes stable (experimental on nodejs 18)
  // but WebCrypto does not have compatibility with Fastly Compute runtime (lacking some objects/methods in Fastly)
  // so following test should run only be polyfill-ed via vite-plugin-fastly-js-compute plugin.
  // To confirm polyfill-ed or not, check __fastlyComputeNodeDefaultCrypto field is true.
  it.runIf(!globalThis.__fastlyComputeNodeDefaultCrypto)('Should throw error', () => {
    expect(() => {
      app.use('/jwt/*', jwt({ secret: 'secret' }))
    }).toThrow(/`crypto.subtle.importKey` is undefined/)
  })
})
