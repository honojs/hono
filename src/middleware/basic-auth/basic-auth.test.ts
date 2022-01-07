import { Hono, Middleware } from '../../hono'
const makeServiceWorkerEnv = require('service-worker-mock')

declare let global: any
describe('Basic Auth by Middleware', () => {
  const crypto = global.crypto
  beforeAll(() => {
    Object.assign(global, makeServiceWorkerEnv())
    global.crypto = require('crypto').webcrypto
  })
  afterAll(() => {
    global.crypto = crypto
  })

  const app = new Hono()
  const username = 'hono-user-a'
  const password = 'hono-password-a'

  app.use(
    '*',
    Middleware.basicAuth({
      username,
      password,
    })
  )
  app.get('/', () => new Response('root'))

  it('Unauthorized', async () => {
    const req = new Request('/')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('Authorizated', async () => {
    const credential = Buffer.from(username + ':' + password).toString('base64')

    const req = new Request('/')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('root')
  })
})
