const Router = require('./hono')

describe('Basic Usage', () => {
  let router = Router()
  it('get, post hello', () => {
    router.get('/hello', 'get hello')
    router.post('/hello', 'post hello')

    let res = router.match('GET', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get hello')

    res = router.match('POST', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('post hello')

    res = router.match('PUT', '/hello')
    expect(res).toBeNull()

    res = router.match('GET', '/')
    expect(res).toBeNull()
  })
})

describe('Complex', () => {
  let router = Router()

  it('Named Param', () => {
    router.get('/entry/:id', 'get entry')
    res = router.match('GET', '/entry/123')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get entry')
    expect(res.params['id']).toBe('123')
  })

  it('Wildcard', () => {
    router.get('/wild/*/card', 'get wildcard')
    res = router.match('GET', '/wild/xxx/card')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get wildcard')
  })

  it('Regexp', () => {
    router.get('/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
    res = router.match('GET', '/post/20210101/hello')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get post')
    expect(res.params['date']).toBe('20210101')
    expect(res.params['title']).toBe('hello')
    res = router.match('GET', '/post/onetwothree')
    expect(res).toBeNull()
    res = router.match('GET', '/post/123/123')
    expect(res).toBeNull()
  })
})

describe('Chained Route', () => {
  let router = Router()
  it('Return rooter object', () => {
    router = router.patch('/hello', 'patch hello')
    expect(router).not.toBeNull()
    router = router.delete('/hello', 'delete hello')
    res = router.match('DELETE', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('delete hello')
  })
  it('Chain with route method', () => {
    router.route('/api/book').get('get book').post('post book').put('put book')
    res = router.match('GET', '/api/book')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get book')
    res = router.match('POST', '/api/book')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('post book')
    res = router.match('PUT', '/api/book')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('put book')
    res = router.match('DELETE', '/api/book')
    expect(res).toBeNull()
  })
})
