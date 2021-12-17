const Router = require('./router')
let router = Router()

describe('Basic Usage', () => {
  it('get, post root', () => {
    router.get('/', 'get root')
    router.post('/', 'post root')

    let res = router.matchRoute('GET', '/')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get root')

    res = router.matchRoute('POST', '/')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('post root')

    res = router.matchRoute('PUT', '/')
    expect(res).toBeNull()

    res = router.matchRoute('GET', '/nothing')
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
    router = router.patch('/', 'patch root')
    expect(router).not.toBeNull()
    router = router.delete('/', 'delete root')
    res = router.matchRoute('DELETE', '/')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('delete root')
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
