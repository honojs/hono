import { Hono } from '../../hono'
import { trimTrailingSlash, appendTrailingSlash } from '.'

describe('Resolve trailing slash', () => {
  let app: Hono

  it('Trim', async () => {
    app = new Hono({ strict: true })

    app.use('*', trimTrailingSlash())

    app.get('/', async (c) => {
      return c.text('ok')
    })
    app.get('/the/example/endpoint/without/trailing/slash', async (c) => {
      return c.text('ok')
    })

    let resp: Response

    resp = await app.request('/')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(200)

    resp = await app.request('/the/example/endpoint/without/trailing/slash/')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(301)

    resp = await app.request('/the/example/endpoint/without/trailing/slash')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(200)
  })

  it('Append', async () => {
    app = new Hono({ strict: true })

    app.use('*', appendTrailingSlash())

    app.get('/the/example/endpoint/with/trailing/slash/', async (c) => {
      return c.text('ok')
    })
    app.get('/the/example/simulate/a.file', async (c) => {
      return c.text('ok')
    })

    let resp: Response

    resp = await app.request('/the/example/endpoint/with/trailing/slash')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(301)

    resp = await app.request('/the/example/endpoint/with/trailing/slash/')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(200)

    resp = await app.request('/the/example/simulate/a.file')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(200)
  })
})
