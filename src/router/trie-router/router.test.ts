import { TrieRouter } from './router'

describe('Basic Usage', () => {
  const router = new TrieRouter<string>()

  router.add('GET', '/hello', 'get hello')
  router.add('POST', '/hello', 'post hello')
  router.add('PURGE', '/hello', 'purge hello')

  it('get, post hello', async () => {
    let [res] = router.match('GET', '/hello')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('get hello')

    ;[res] = router.match('POST', '/hello')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('post hello')

    ;[res] = router.match('PURGE', '/hello')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('purge hello')

    ;[res] = router.match('PUT', '/hello')
    expect(res.length).toBe(0)

    ;[res] = router.match('GET', '/')
    expect(res.length).toBe(0)
  })
})

describe('Complex', () => {
  const router = new TrieRouter<string>()

  it('Named Param', async () => {
    router.add('GET', '/entry/:id', 'get entry')
    const [res] = router.match('GET', '/entry/123')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('get entry')
    expect(res[0][1]['id']).toBe('123')
  })

  it('Named param with trailing wildcard', async () => {
    router.add('GET', '/article/:id/*', 'get article with wildcard')
    let [res] = router.match('GET', '/article/123')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('get article with wildcard')
    expect(res[0][1]['id']).toBe('123')

    ;[res] = router.match('GET', '/article/123/action')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('get article with wildcard')
    expect(res[0][1]['id']).toBe('123')
  })

  it('Wildcard', async () => {
    router.add('GET', '/wild/*/card', 'get wildcard')
    const [res] = router.match('GET', '/wild/xxx/card')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('get wildcard')
  })

  it('Default', async () => {
    router.add('GET', '/api/*', 'fallback')
    router.add('GET', '/api/abc', 'get api')
    let [res] = router.match('GET', '/api/abc')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('fallback')
    expect(res[1][0]).toEqual('get api')
    ;[res] = router.match('GET', '/api/def')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('fallback')
  })

  it('Regexp', async () => {
    router.add('GET', '/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
    let [res] = router.match('GET', '/post/20210101/hello')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('get post')
    expect(res[0][1]['date']).toBe('20210101')
    expect(res[0][1]['title']).toBe('hello')
    ;[res] = router.match('GET', '/post/onetwothree')
    expect(res.length).toBe(0)
    ;[res] = router.match('GET', '/post/123/123')
    expect(res.length).toBe(0)
  })
})

describe('Multi match', () => {
  const router = new TrieRouter<string>()

  describe('Blog', () => {
    router.add('ALL', '*', 'middleware a')
    router.add('GET', '*', 'middleware b')
    router.add('GET', '/entry', 'get entries')
    router.add('POST', '/entry/*', 'middleware c')
    router.add('POST', '/entry', 'post entry')
    router.add('GET', '/entry/:id', 'get entry')
    router.add('GET', '/entry/:id/comment/:comment_id', 'get comment')
    it('GET /', async () => {
      const [res] = router.match('GET', '/')
      expect(res.length).toBe(2)
      expect(res[0][0]).toEqual('middleware a')
      expect(res[1][0]).toEqual('middleware b')
    })
    it('GET /entry/123', async () => {
      const [res] = router.match('GET', '/entry/123')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('middleware a')
      expect(res[0][1]['id']).toBe(undefined)
      expect(res[1][0]).toEqual('middleware b')
      expect(res[1][1]['id']).toBe(undefined)
      expect(res[2][0]).toEqual('get entry')
      expect(res[2][1]['id']).toBe('123')
    })
    it('GET /entry/123/comment/456', async () => {
      const [res] = router.match('GET', '/entry/123/comment/456')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('middleware a')
      expect(res[0][1]['id']).toBe(undefined)
      expect(res[0][1]['comment_id']).toBe(undefined)
      expect(res[1][0]).toEqual('middleware b')
      expect(res[1][1]['id']).toBe(undefined)
      expect(res[1][1]['comment_id']).toBe(undefined)
      expect(res[2][0]).toEqual('get comment')
      expect(res[2][1]['id']).toBe('123')
      expect(res[2][1]['comment_id']).toBe('456')
    })
    it('POST /entry', async () => {
      const [res] = router.match('POST', '/entry')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('middleware a')
      expect(res[1][0]).toEqual('middleware c')
      expect(res[2][0]).toEqual('post entry')
    })
    it('DELETE /entry', async () => {
      const [res] = router.match('DELETE', '/entry')
      expect(res.length).toBe(1)
      expect(res[0][0]).toEqual('middleware a')
    })
  })
})

describe('Fallback', () => {
  const router = new TrieRouter<string>()
  router.add('POST', '/entry', 'post entry')
  router.add('POST', '/entry/*', 'fallback')
  router.add('GET', '/entry/:id', 'get entry')
  it('POST /entry', async () => {
    const [res] = router.match('POST', '/entry')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('post entry')
    expect(res[1][0]).toEqual('fallback')
  })
})

describe('page', () => {
  const router = new TrieRouter<string>()
  router.add('GET', '/page', 'page')
  router.add('ALL', '*', 'fallback') // or '*'
  it('GET /page', async () => {
    const [res] = router.match('GET', '/page')
    expect(res[0][0]).toEqual('page')
    expect(res[1][0]).toEqual('fallback')
  })
})

describe('Optional route', () => {
  const router = new TrieRouter<string>()
  router.add('GET', '/api/animals/:type?', 'animals')
  it('GET /api/animals/dog', async () => {
    const [res] = router.match('GET', '/api/animals/dog')
    expect(res[0][0]).toEqual('animals')
    expect(res[0][1]['type']).toBe('dog')
  })
  it('GET /api/animals', async () => {
    const [res] = router.match('GET', '/api/animals')
    expect(res[0][0]).toEqual('animals')
    expect(res[0][1]['type']).toBeUndefined()
  })
})

describe('routing order with named parameters', () => {
  const router = new TrieRouter<string>()
  router.add('GET', '/book/a', 'no-slug')
  router.add('GET', '/book/:slug', 'slug')
  router.add('GET', '/book/b', 'no-slug-b')
  it('GET /book/a', async () => {
    const [res] = router.match('GET', '/book/a')
    expect(res[0][0]).toEqual('no-slug')
    expect(res[0][1]['slug']).toBe(undefined)
    expect(res[1][0]).toEqual('slug')
    expect(res[1][1]['slug']).toBe('a')
  })
  it('GET /book/foo', async () => {
    const [res] = router.match('GET', '/book/foo')
    expect(res[0][0]).toEqual('slug')
    expect(res[0][1]['slug']).toBe('foo')
  })
  it('GET /book/b', async () => {
    const [res] = router.match('GET', '/book/b')
    expect(res[0][0]).toEqual('slug')
    expect(res[0][1]['slug']).toBe('b')
    expect(res[1][0]).toEqual('no-slug-b')
    expect(res[1][1]['slug']).toBe(undefined)
  })
})

describe('Routing with a hostname', () => {
  const router = new TrieRouter<string>()
  router.add('get', 'www1.example.com/hello', 'www1')
  router.add('get', 'www2.example.com/hello', 'www2')
  it('GET www1.example.com/hello', () => {
    const [res] = router.match('get', 'www1.example.com/hello')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('www1')
  })
  it('GET www2.example.com/hello', () => {
    const [res] = router.match('get', 'www2.example.com/hello')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('www2')
  })
  it('GET /hello', () => {
    const [res] = router.match('get', '/hello')
    expect(res.length).toBe(0)
  })
})
