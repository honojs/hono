const Hono = require('./hono')
const fetch = require('node-fetch')

describe('GET Request', () => {
  const app = Hono()
  app.get('/hello', () => {
    return new fetch.Response('hello', {
      status: 200,
    })
  })
  app.notFound = () => {
    return new fetch.Response('not found', {
      status: 404,
    })
  }
  it('GET /hello is ok', async () => {
    let req = new fetch.Request('https://example.com/hello')
    let res = await app.dispatch(req, new fetch.Response())
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })
  it('GET / is not found', async () => {
    let req = new fetch.Request('https://example.com/')
    let res = await app.dispatch(req, new fetch.Response())
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
  })
})

describe('params and query', () => {
  const app = Hono()

  app.get('/entry/:id', async (c) => {
    const id = await c.req.params('id')
    return new fetch.Response(`id is ${id}`, {
      status: 200,
    })
  })

  app.get('/search', async (c) => {
    const name = await c.req.query('name')
    return new fetch.Response(`name is ${name}`, {
      status: 200,
    })
  })

  it('params of /entry/:id is found', async () => {
    let req = new fetch.Request('https://example.com/entry/123')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('id is 123')
  })
  it('query of /search?name=sam is found', async () => {
    let req = new fetch.Request('https://example.com/search?name=sam')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('name is sam')
  })
})

describe('Middleware', () => {
  const app = Hono()

  const logger = (c, next) => {
    console.log(`${c.req.method} : ${c.req.url}`)
    next()
  }

  const customHeader = (c, next) => {
    next()
    c.res.headers.append('x-message', 'custom-header')
  }

  app.use('*', logger)
  app.use('/hello', customHeader)
  app.get('/hello', () => {
    return new fetch.Response('hello')
  })

  it('logging and custom header', async () => {
    let req = new fetch.Request('https://example.com/hello')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
    expect(await res.headers.get('x-message')).toBe('custom-header')
  })
})
