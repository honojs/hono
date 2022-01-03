const { Hono } = require('../src/hono')

describe('Basic Usage', () => {
  const router = new Hono()

  it('get, post hello', async () => {
    router.get('/hello', 'get hello')
    router.post('/hello', 'post hello')

    let res = await router.matchRoute('GET', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get hello')

    res = await router.matchRoute('POST', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('post hello')

    res = await router.matchRoute('PUT', '/hello')
    expect(res).toBeNull()

    res = await router.matchRoute('GET', '/')
    expect(res).toBeNull()
  })
})

describe('Complex', () => {
  let router = new Hono()

  it('Named Param', async () => {
    router.get('/entry/:id', 'get entry')
    res = await router.matchRoute('GET', '/entry/123')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get entry')
    expect(res.params['id']).toBe('123')
  })

  it('Wildcard', async () => {
    router.get('/wild/*/card', 'get wildcard')
    res = await router.matchRoute('GET', '/wild/xxx/card')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get wildcard')
  })

  it('Regexp', async () => {
    router.get('/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
    res = await router.matchRoute('GET', '/post/20210101/hello')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get post')
    expect(res.params['date']).toBe('20210101')
    expect(res.params['title']).toBe('hello')
    res = await router.matchRoute('GET', '/post/onetwothree')
    expect(res).toBeNull()
    res = await router.matchRoute('GET', '/post/123/123')
    expect(res).toBeNull()
  })
})

describe('Chained Route', () => {
  let router = new Hono()

  it('Return rooter object', async () => {
    router = router.patch('/hello', 'patch hello')
    expect(router).not.toBeNull()
    router = router.delete('/hello', 'delete hello')
    res = await router.matchRoute('DELETE', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('delete hello')
  })

  it('Chain with route method', async () => {
    router.route('/api/book').get('get book').post('post book').put('put book')

    res = await router.matchRoute('GET', '/api/book')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('get book')

    res = await router.matchRoute('POST', '/api/book')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('post book')

    res = await router.matchRoute('PUT', '/api/book')
    expect(res).not.toBeNull()
    expect(res.handler[0]).toBe('put book')

    res = await router.matchRoute('DELETE', '/api/book')
    expect(res).toBeNull()
  })
})
