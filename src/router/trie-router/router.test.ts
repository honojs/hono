import { TrieRouter } from './router'

describe('Basic Usage', () => {
  const router = new TrieRouter<string>()

  router.add('GET', '/hello', 'get hello')
  router.add('POST', '/hello', 'post hello')

  it('get, post hello', async () => {
    let res = router.match('GET', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get hello')

    res = router.match('POST', '/hello')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('post hello')

    res = router.match('PUT', '/hello')
    expect(res).toBeNull()

    res = router.match('GET', '/')
    expect(res).toBeNull()
  })
})

describe('Complex', () => {
  const router = new TrieRouter<string>()

  it('Named Param', async () => {
    router.add('GET', '/entry/:id', 'get entry')
    const res = router.match('GET', '/entry/123')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get entry')
    expect(res.params['id']).toBe('123')
  })

  it('Wildcard', async () => {
    router.add('GET', '/wild/*/card', 'get wildcard')
    const res = router.match('GET', '/wild/xxx/card')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get wildcard')
  })

  it('Default', async () => {
    router.add('GET', '/api/abc', 'get api')
    router.add('GET', '/api/*', 'fallback')
    let res = router.match('GET', '/api/abc')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get api')
    res = router.match('GET', '/api/def')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('fallback')
  })

  it('Regexp', async () => {
    router.add('GET', '/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
    let res = router.match('GET', '/post/20210101/hello')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get post')
    expect(res.params['date']).toBe('20210101')
    expect(res.params['title']).toBe('hello')
    res = router.match('GET', '/post/onetwothree')
    expect(res).toBeNull()
    res = router.match('GET', '/post/123/123')
    expect(res).toBeNull()
  })
})
