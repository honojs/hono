const Hono = require('./hono')
const fetch = require('node-fetch')

const app = Hono()

describe('GET match', () => {
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
