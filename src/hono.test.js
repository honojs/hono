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
    let res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
  })
  it('GET / is not found', async () => {
    let req = new fetch.Request('https://example.com/')
    let res = await app.dispatch(req)
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
  let app = Hono()

  const logger = (req, _, next) => {
    console.log(`${req.method} : ${req.url}`)
    next()
  }
  const customHeader = (_, res, next) => {
    next()
    res.headers.append('x-message', 'custom-header')
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
    expect(res.headers.get('x-message')).toBe('custom-header')
  })
})
