import makeServiceWorkerEnv from 'service-worker-mock'
import { Hono, Middleware } from '../../hono'
// eslint-disable-next-line node/no-extraneous-require
const FormData = require('form-data')

declare let global: any
Object.assign(global, makeServiceWorkerEnv())

describe('Parse Body Middleware', () => {
  const app = new Hono()

  app.use('*', Middleware.bodyParse())
  app.post('/json', async (ctx) => {
    return ctx.json(ctx.req.parsedBody, 200)
  })
  app.post('/text', async (ctx) => {
    return ctx.text(ctx.req.parsedBody, 200)
  })
  app.post('/form', async (ctx) => {
    return ctx.json(ctx.req.parsedBody, 200)
  })

  it('POST with JSON', async () => {
    const payload = { message: 'hello hono' }
    const req = new Request('/json', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(req.parsedBody).toEqual(payload)
    expect(await res.json()).toEqual(payload)
  })

  it.only('POST with text', async () => {
    const payload = 'hello'
    const req = new Request('/text', {
      method: 'POST',
      body: 'hello',
      headers: new Headers({ 'Content-Type': 'application/text' }),
    })
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(req.parsedBody).toEqual(payload)
    expect(await res.text()).toEqual(payload)
  })

  // NOTE the service-worker-mock does not support req.formData()
  // so disable this test case, but verify it on live cloudflare worker,
  // it works, tracked by https://github.com/yusukebe/hono/issues/40
  it.skip('POST with form', async () => {
    const formData = new FormData()
    formData.append('message', 'hello')
    const req = new Request('/form', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    })
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(req.parsedBody).toEqual({ message: 'hello' })
    expect(await res.json()).toEqual({ message: 'hello' })
  })
})
