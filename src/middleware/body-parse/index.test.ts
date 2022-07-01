import { Hono } from '../../hono'
import { bodyParse } from '.'

describe('Parse Body Middleware', () => {
  const app = new Hono()

  app.use('*', bodyParse())
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
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(req.parsedBody).toEqual(payload)
    expect(await res.json()).toEqual(payload)
  })

  it('POST with text', async () => {
    const payload = 'hello'
    const req = new Request('http://localhost/text', {
      method: 'POST',
      body: 'hello',
      headers: new Headers({ 'Content-Type': 'application/text' }),
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(req.parsedBody).toEqual(payload)
    expect(await res.text()).toEqual(payload)
  })

  it('POST with form', async () => {
    const formData = new URLSearchParams()
    formData.append('message', 'hello')
    const req = new Request('https://localhost/form', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(req.parsedBody).toEqual({ message: 'hello' })
    expect(await res.json()).toEqual({ message: 'hello' })
  })
})
