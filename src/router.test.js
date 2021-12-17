const Router = require('./hono')
let router = Router()

describe('Basic Usage', () => {
  it('get, post hello', () => {
    router.get('/hello', 'get hello')
    router.post('/hello', 'post hello')

    let res = router.matchRoute('GET', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get hello')

    res = router.matchRoute('POST', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('post hello')

    res = router.matchRoute('PUT', '/hello')
    expect(res).toBeNull()

    res = router.matchRoute('GET', '/')
    expect(res).toBeNull()
  })
})

describe('Complex', () => {
  it('Named Param', () => {
    router.get('/entry/:id', 'get entry')
    res = router.matchRoute('GET', '/entry/123')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get entry')
    expect(res.params['id']).toBe('123')
  })
  it('Wildcard', () => {
    router.get('/wild/*/card', 'get wildcard')
    res = router.matchRoute('GET', '/wild/xxx/card')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get wildcard')
  })
  it('Regexp', () => {
    router.get('/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
    res = router.matchRoute('GET', '/post/20210101/hello')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get post')
    expect(res.params['date']).toBe('20210101')
    expect(res.params['title']).toBe('hello')
    res = router.matchRoute('GET', '/post/onetwothree')
    expect(res).toBeNull()
    res = router.matchRoute('GET', '/post/123/123')
    expect(res).toBeNull()
  })
})

describe('Chained Route', () => {
  it('Return rooter object', () => {
    router = router.patch('/hello', 'patch hello')
    expect(router).not.toBeNull()
    router = router.delete('/hello', 'delete hello')
    res = router.matchRoute('DELETE', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('delete hello')
  })
  it('Chain with route method', () => {
    router.route('/api/book').get('get book').post('post book').put('put book')
    res = router.matchRoute('GET', '/api/book')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get book')
    res = router.matchRoute('POST', '/api/book')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('post book')
    res = router.matchRoute('PUT', '/api/book')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('put book')
    res = router.matchRoute('DELETE', '/api/book')
    expect(res).toBeNull()
  })
})
