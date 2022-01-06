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
  const name = 'hono-user-a'
  const pass = 'hono-pass-a'

  app.use(
    '*',
    Middleware.basicAuth({
      name,
      pass,
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
    const credential = Buffer.from(name + ':' + pass).toString('base64')

    const req = new Request('/')
    req.headers.set('Authorization', `Basic ${credential}`)
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('root')
  })
})
