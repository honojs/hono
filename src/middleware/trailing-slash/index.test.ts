import { Hono } from '../../hono'
import { appendTrailingSlash, trimTrailingSlash } from '.'

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

    let resp: Response, loc: URL

    resp = await app.request('/')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(200)

    resp = await app.request('/the/example/endpoint/without/trailing/slash')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(200)

    resp = await app.request('/the/example/endpoint/without/trailing/slash/')
    loc = new URL(resp.headers.get('location')!)
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(301)
    expect(loc.pathname).toBe('/the/example/endpoint/without/trailing/slash')

    resp = await app.request('/the/example/endpoint/without/trailing/slash/?exampleParam=1')
    loc = new URL(resp.headers.get('location')!)
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(301)
    expect(loc.pathname).toBe('/the/example/endpoint/without/trailing/slash')
    expect(loc.searchParams.get('exampleParam')).toBe('1')
  })

  it('Append', async () => {
    app = new Hono({ strict: true })

    app.use('*', appendTrailingSlash())

    app.get('/', async (c) => {
      return c.text('ok')
    })
    app.get('/the/example/endpoint/with/trailing/slash/', async (c) => {
      return c.text('ok')
    })
    app.get('/the/example/simulate/a.file', async (c) => {
      return c.text('ok')
    })

    let resp: Response, loc: URL

    resp = await app.request('/')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(200)

    resp = await app.request('/the/example/simulate/a.file')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(200)

    resp = await app.request('/the/example/endpoint/with/trailing/slash/')
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(200)

    resp = await app.request('/the/example/endpoint/with/trailing/slash')
    loc = new URL(resp.headers.get('location')!)
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(301)
    expect(loc.pathname).toBe('/the/example/endpoint/with/trailing/slash/')

    resp = await app.request('/the/example/endpoint/with/trailing/slash?exampleParam=1')
    loc = new URL(resp.headers.get('location')!)
    expect(resp).not.toBeNull()
    expect(resp.status).toBe(301)
    expect(loc.pathname).toBe('/the/example/endpoint/with/trailing/slash/')
    expect(loc.searchParams.get('exampleParam')).toBe('1')
  })
})
