import { LinearRouter } from './router'

describe('Basic Usage', () => {
  const router = new LinearRouter<string>()

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
  let router: LinearRouter<string>
  beforeEach(() => {
    router = new LinearRouter<string>()
  })

  it('Named Param', async () => {
    router.add('GET', '/entry/:id', 'get entry')
    const res = router.match('GET', '/entry/123')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get entry'])
    expect(res?.params['id']).toBe('123')
  })

  it('Wildcard', async () => {
    router.add('GET', '/wild/*/card', 'get wildcard')

    let res = router.match('GET', '/wild/xxx/card')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get wildcard'])

    res = router.match('GET', '/wild/xxx/card/yyy')
    expect(res).toBeNull()
  })

  it('Default', async () => {
    router.add('GET', '/api/abc', 'get api')
    router.add('GET', '/api/*', 'fallback')
    let res = router.match('GET', '/api/abc')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get api', 'fallback'])
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

  it('/*', async () => {
    router.add('GET', '/api/*', 'auth middleware')
    router.add('GET', '/api', 'top')
    router.add('GET', '/api/posts', 'posts')
    router.add('GET', '/api/*', 'fallback')

    let res = router.match('GET', '/api')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['auth middleware', 'top', 'fallback'])

    res = router.match('GET', '/api/posts')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['auth middleware', 'posts', 'fallback'])
  })
})

describe('Multi match', () => {
  const router = new LinearRouter<string>()

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

describe('page', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/page', 'page')
  router.add('ALL', '*', 'fallback') // or '*'
  it('GET /page', async () => {
    const res = router.match('GET', '/page')
    expect(res?.handlers).toEqual(['page', 'fallback'])
  })
})

describe('Optional route', () => {
  const router = new LinearRouter<string>()
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

describe('Trailing slash', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/book', 'GET /book')
  router.add('GET', '/book/:id', 'GET /book/:id')
  it('GET /book', () => {
    const res = router.match('GET', '/book')
    expect(res?.handlers).toEqual(['GET /book'])
  })
  it('GET /book/', () => {
    const res = router.match('GET', '/book/')
    expect(res?.handlers).toEqual(['GET /book'])
  })
})

describe('Same path', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/hey', 'Middleware A')
  router.add('GET', '/hey', 'Middleware B')
  it('GET /hey', () => {
    const res = router.match('GET', '/hey')
    expect(res?.handlers).toEqual(['Middleware A', 'Middleware B'])
  })
})

describe('Including slashes', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/js/:filename{[a-z0-9/]+.js}', 'any file')
  router.add('GET', '/js/main.js', 'main.js')

  it('GET /js/main.js', () => {
    const res = router.match('GET', '/js/main.js')
    expect(res?.handlers).toEqual(['any file', 'main.js'])
    expect(res?.params).toEqual({ filename: 'main.js' })
  })

  it('get /js/chunk/123.js', () => {
    const res = router.match('GET', '/js/chunk/123.js')
    expect(res?.handlers).toEqual(['any file'])
    expect(res?.params).toEqual({ filename: 'chunk/123.js' })
  })

  it('get /js/chunk/nest/123.js', () => {
    const res = router.match('GET', '/js/chunk/nest/123.js')
    expect(res?.handlers).toEqual(['any file'])
    expect(res?.params).toEqual({ filename: 'chunk/nest/123.js' })
  })
})

describe('REST API', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/users/:username{[a-z]+}', 'profile')
  router.add('GET', '/users/:username{[a-z]+}/posts', 'posts')

  it('GET /users/hono', () => {
    const res = router.match('GET', '/users/hono')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['profile'])
  })

  it('GET /users/hono/posts', () => {
    const res = router.match('GET', '/users/hono/posts')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['posts'])
  })
})

describe('star', () => {
  const router = new LinearRouter<string>()
  router.add('get', '/', '/')
  router.add('get', '/*', '/*')
  router.add('get', '*', '*')

  router.add('get', '/x', '/x')
  router.add('get', '/x/*', '/x/*')

  it('top', async () => {
    const res = router.match('get', '/')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['/', '/*', '*']) // =>  failed ['*', '/*', '/']
  })

  it('Under a certain path', async () => {
    const res = router.match('get', '/x')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['/*', '*', '/x', '/x/*'])
  })
})

describe('Duplicate param name', () => {
  it('self', () => {
    const router = new LinearRouter<string>()
    router.add('GET', '/:id/:id', 'foo')
    expect(() => {
      router.match('GET', '/123/456')
    }).toThrowError(/Duplicate param name/)
  })

  it('parent', () => {
    const router = new LinearRouter<string>()
    router.add('GET', '/:id/:action', 'foo')
    router.add('GET', '/posts/:id', 'bar')
    expect(() => {
      router.match('GET', '/posts/get')
    }).toThrowError(/Duplicate param name/)
  })

  it('child', () => {
    const router = new LinearRouter<string>()
    router.add('GET', '/posts/:id', 'foo')
    router.add('GET', '/:id/:action', 'bar')
    expect(() => {
      router.match('GET', '/posts/get')
    }).toThrowError(/Duplicate param name/)
  })
})

describe('Routing with a hostname', () => {
  const router = new LinearRouter<string>()
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
