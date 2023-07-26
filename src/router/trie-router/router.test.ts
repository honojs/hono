import { TrieRouter } from './router'

describe('Basic Usage', () => {
  const router = new TrieRouter<string>()

  router.add('GET', '/hello', 'get hello')
  router.add('POST', '/hello', 'post hello')
  router.add('PURGE', '/hello', 'purge hello')

  it('get, post hello', async () => {
    let res = router.match('GET', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get hello'])

    res = router.match('POST', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['post hello'])

    res = router.match('PURGE', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['purge hello'])

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
    expect(res?.handlers).toEqual(['get entry'])
    expect(res?.params['id']).toBe('123')
  })

  it('Named param with trailing wildcard', async () => {
    router.add('GET', '/article/:id/*', 'get article with wildcard')
    let res = router.match('GET', '/article/123')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get article with wildcard'])
    expect(res?.params['id']).toBe('123')

    res = router.match('GET', '/article/123/action')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get article with wildcard'])
    expect(res?.params['id']).toBe('123')
  })

  it('Wildcard', async () => {
    router.add('GET', '/wild/*/card', 'get wildcard')
    const res = router.match('GET', '/wild/xxx/card')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get wildcard'])
  })

  it('Default', async () => {
    router.add('GET', '/api/*', 'fallback')
    router.add('GET', '/api/abc', 'get api')
    let res = router.match('GET', '/api/abc')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['fallback', 'get api'])
    res = router.match('GET', '/api/def')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['fallback'])
  })

  it('Regexp', async () => {
    router.add('GET', '/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
    let res = router.match('GET', '/post/20210101/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get post'])
    expect(res?.params['date']).toBe('20210101')
    expect(res?.params['title']).toBe('hello')
    res = router.match('GET', '/post/onetwothree')
    expect(res).toBeNull()
    res = router.match('GET', '/post/123/123')
    expect(res).toBeNull()
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
      const res = router.match('GET', '/')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b'])
    })
    it('GET /entry/123', async () => {
      const res = router.match('GET', '/entry/123')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b', 'get entry'])
      expect(res?.params['id']).toBe('123')
    })
    it('GET /entry/123/comment/456', async () => {
      const res = router.match('GET', '/entry/123/comment/456')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b', 'get comment'])
      expect(res?.params['id']).toBe('123')
      expect(res?.params['comment_id']).toBe('456')
    })
    it('POST /entry', async () => {
      const res = router.match('POST', '/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware c', 'post entry'])
    })
    it('DELETE /entry', async () => {
      const res = router.match('DELETE', '/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a'])
    })
  })
})

describe('Fallback', () => {
  const router = new TrieRouter<string>()
  router.add('POST', '/entry', 'post entry')
  router.add('POST', '/entry/*', 'fallback')
  router.add('GET', '/entry/:id', 'get entry')
  it('POST /entry', async () => {
    const res = router.match('POST', '/entry')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['post entry', 'fallback'])
  })
})

describe('page', () => {
  const router = new TrieRouter<string>()
  router.add('GET', '/page', 'page')
  router.add('ALL', '*', 'fallback') // or '*'
  it('GET /page', async () => {
    const res = router.match('GET', '/page')
    expect(res?.handlers).toEqual(['page', 'fallback'])
  })
})

describe('Optional route', () => {
  const router = new TrieRouter<string>()
  router.add('GET', '/api/animals/:type?', 'animals')
  it('GET /api/animals/dog', async () => {
    const res = router.match('GET', '/api/animals/dog')
    expect(res?.handlers).toEqual(['animals'])
    expect(res?.params['type']).toBe('dog')
  })
  it('GET /api/animals', async () => {
    const res = router.match('GET', '/api/animals')
    expect(res?.handlers).toEqual(['animals'])
    expect(res?.params['type']).toBeUndefined()
  })
})

describe('routing order with named parameters', () => {
  const router = new TrieRouter<string>()
  router.add('GET', '/book/a', 'no-slug')
  router.add('GET', '/book/:slug', 'slug')
  router.add('GET', '/book/b', 'no-slug-b')
  it('GET /book/a', async () => {
    const res = router.match('GET', '/book/a')
    expect(res?.handlers).toEqual(['no-slug', 'slug'])
    expect(res?.params['slug']).toBe('a')
  })
  it('GET /book/foo', async () => {
    const res = router.match('GET', '/book/foo')
    expect(res?.handlers).toEqual(['slug'])
    expect(res?.params['slug']).toBe('foo')
  })
  it('GET /book/b', async () => {
    const res = router.match('GET', '/book/b')
    expect(res?.handlers).toEqual(['slug', 'no-slug-b'])
    expect(res?.params['slug']).toBe('b')
  })
})

describe('Routing with a hostname', () => {
  const router = new TrieRouter<string>()
  router.add('get', 'www1.example.com/hello', 'www1')
  router.add('get', 'www2.example.com/hello', 'www2')
  it('GET www1.example.com/hello', () => {
    const res = router.match('get', 'www1.example.com/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['www1'])
  })
  it('GET www2.example.com/hello', () => {
    const res = router.match('get', 'www2.example.com/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['www2'])
  })
  it('GET /hello', () => {
    const res = router.match('get', '/hello')
    expect(res).toBeNull()
  })
})

describe('Path includes `..`', () => {
  const router = new TrieRouter<string>()
  router.add('get', '/../hello', '/../hello')
  router.add('get', '/hello/..', '/hello/..')
  router.add('get', '/hello/../hello', '/hello/../hello')

  it('Should not match with GET /../hello', () => {
    const res = router.match('get', '/../hello')
    expect(res).toBeNull()
  })
  it('Should not match with GET /hello/..', () => {
    const res = router.match('get', '/hello/..')
    expect(res).toBeNull()
  })
  it('Should not match with GET /hello/../hello', () => {
    const res = router.match('get', '/hello/../hello')
    expect(res).toBeNull()
  })
})
