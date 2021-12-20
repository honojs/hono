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
  it('GET /hello is ok', () => {
    let req = new fetch.Request('https://example.com/hello')
    let res = app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
  })
  it('GET / is not found', () => {
    let req = new fetch.Request('https://example.com/')
    let res = app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
  })
})

describe('params and query', () => {
  const app = Hono()
  app.get('/entry/:id', (req) => {
    const id = req.params('id')
    return new fetch.Response(`id is ${id}`, {
      status: 200,
    })
  })
  app.get('/search', (req) => {
    const name = req.query('name')
    return new fetch.Response(`name is ${name}`, {
      status: 200,
    })
  })
  it('params of /entry/:id is found', async () => {
    let req = new fetch.Request('https://example.com/entry/123')
    let res = app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('id is 123')
  })
  it('query of /search?name=sam is found', async () => {
    let req = new fetch.Request('https://example.com/search?name=sam')
    let res = app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('name is sam')
  })
})

describe('Middleware', () => {
  const app = Hono()
  const logger = (req) => {
    console.log(`${req.method} : ${req.url}`)
  }
  app.get('/*', logger, () => {
    return new fetch.Response('log!')
  })
  it('logger', async () => {
    let req = new fetch.Request('https://example.com/log')
    let res = app.dispatch(req)
    expect(res.status).toBe(200)
  })
})
