import { Hono } from '../../hono'
import { trimTrailingSlash, appendTrailingSlash } from '.'

describe('Resolve trailing slash', () => {
  let app: Hono

  it('Trim', async () => {
    app = new Hono({ strict: true })
    
    app.use('*', trimTrailingSlash())

    app.get('/the/example/endpoint/without/trailing/slash', async (c) => {
        return c.text('OK')
    })

    const resp = await app.request('/the/example/endpoint/without/trailing/slash/')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(301) // 301 Moved Permanently is the expected behavior
  })

  it('Append', async () => {
    app = new Hono({ strict: true })
    
    app.use('*', appendTrailingSlash())

    app.get('/the/example/endpoint/with/trailing/slash/', async (c) => {
        return c.text('OK')
    })

    const resp = await app.request('/the/example/endpoint/with/trailing/slash')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(301) // 301 Moved Permanently is the expected behavior
  })
})
