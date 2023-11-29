import { LinearRouter } from './router.ts'

describe('Basic Usage', () => {
  const router = new LinearRouter<string>()

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
  let router: LinearRouter<string>
  beforeEach(() => {
    router = new LinearRouter<string>()
  })

  it('Named Param', async () => {
    router.add('GET', '/entry/:id', 'get entry')
    const [res] = router.match('GET', '/entry/123')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('get entry')
    expect(res[0][1]['id']).toBe('123')
  })

  it('Wildcard', async () => {
    router.add('GET', '/wild/*/card', 'get wildcard')

    let [res] = router.match('GET', '/wild/xxx/card')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('get wildcard')
    ;[res] = router.match('GET', '/wild/xxx/card/yyy')
    expect(res.length).toBe(0)
  })

  it('Default', async () => {
    router.add('GET', '/api/abc', 'get api')
    router.add('GET', '/api/*', 'fallback')
    let [res] = router.match('GET', '/api/abc')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('get api')
    expect(res[1][0]).toEqual('fallback')
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

  it('/*', async () => {
    router.add('GET', '/api/*', 'auth middleware')
    router.add('GET', '/api', 'top')
    router.add('GET', '/api/posts', 'posts')
    router.add('GET', '/api/*', 'fallback')

    let [res] = router.match('GET', '/api')
    expect(res.length).toBe(3)
    expect(res[0][0]).toEqual('auth middleware')
    expect(res[1][0]).toEqual('top')
    expect(res[2][0]).toEqual('fallback')
    ;[res] = router.match('GET', '/api/posts')
    expect(res.length).toBe(3)
    expect(res[0][0]).toEqual('auth middleware')
    expect(res[1][0]).toEqual('posts')
    expect(res[2][0]).toEqual('fallback')
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
      const [res] = router.match('GET', '/')
      expect(res.length).toBe(2)
      expect(res[0][0]).toEqual('middleware a')
      expect(res[0][1]).toEqual({})
      expect(res[1][0]).toEqual('middleware b')
      expect(res[1][1]).toEqual({})
    })
    it('GET /entry/123', async () => {
      const [res] = router.match('GET', '/entry/123')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('middleware a')
      expect(res[0][1]).toEqual({})
      expect(res[1][0]).toEqual('middleware b')
      expect(res[1][1]).toEqual({})
      expect(res[2][0]).toEqual('get entry')
      expect(res[2][1]['id']).toBe('123')
    })
    it('GET /entry/123/comment/456', async () => {
      const [res] = router.match('GET', '/entry/123/comment/456')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('middleware a')
      expect(res[0][1]).toEqual({})
      expect(res[1][0]).toEqual('middleware b')
      expect(res[1][1]).toEqual({})
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

describe('page', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/page', 'page')
  router.add('ALL', '*', 'fallback') // or '*'
  it('GET /page', async () => {
    const [res] = router.match('GET', '/page')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('page')
    expect(res[1][0]).toEqual('fallback')
  })
})

describe('Optional route', () => {
  const router = new LinearRouter<string>()
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

describe('Trailing slash', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/book', 'GET /book')
  router.add('GET', '/book/:id', 'GET /book/:id')
  it('GET /book', () => {
    const [res] = router.match('GET', '/book')
    expect(res[0][0]).toEqual('GET /book')
  })
  it('GET /book/', () => {
    const [res] = router.match('GET', '/book/')
    expect(res[0][0]).toEqual('GET /book')
  })
})

describe('Same path', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/hey', 'Middleware A')
  router.add('GET', '/hey', 'Middleware B')
  it('GET /hey', () => {
    const [res] = router.match('GET', '/hey')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('Middleware A')
    expect(res[1][0]).toEqual('Middleware B')
  })
})

describe('Including slashes', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/js/:filename{[a-z0-9/]+.js}', 'any file')
  router.add('GET', '/js/main.js', 'main.js')

  it('GET /js/main.js', () => {
    const [res] = router.match('GET', '/js/main.js')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('any file')
    expect(res[0][1]).toEqual({ filename: 'main.js' })
    expect(res[1][0]).toEqual('main.js')
    expect(res[1][1]).toEqual({})
  })

  it('get /js/chunk/123.js', () => {
    const [res] = router.match('GET', '/js/chunk/123.js')
    expect(res[0][0]).toEqual('any file')
    expect(res[0][1]).toEqual({ filename: 'chunk/123.js' })
  })

  it('get /js/chunk/nest/123.js', () => {
    const [res] = router.match('GET', '/js/chunk/nest/123.js')
    expect(res[0][0]).toEqual('any file')
    expect(res[0][1]).toEqual({ filename: 'chunk/nest/123.js' })
  })
})

describe('REST API', () => {
  const router = new LinearRouter<string>()
  router.add('GET', '/users/:username{[a-z]+}', 'profile')
  router.add('GET', '/users/:username{[a-z]+}/posts', 'posts')

  it('GET /users/hono', () => {
    const [res] = router.match('GET', '/users/hono')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('profile')
  })

  it('GET /users/hono/posts', () => {
    const [res] = router.match('GET', '/users/hono/posts')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('posts')
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
    const [res] = router.match('get', '/')
    expect(res.length).toBe(3)
    expect(res[0][0]).toEqual('/')
    expect(res[1][0]).toEqual('/*')
    expect(res[2][0]).toEqual('*')
  })

  it('Under a certain path', async () => {
    const [res] = router.match('get', '/x')
    expect(res.length).toBe(4)
    expect(res[0][0]).toEqual('/*')
    expect(res[1][0]).toEqual('*')
    expect(res[2][0]).toEqual('/x')
    expect(res[3][0]).toEqual('/x/*')
  })
})

describe('Duplicate param name', () => {
  it('self', () => {
    const router = new LinearRouter<string>()
    router.add('GET', '/:id/:id', 'foo')
    const [res] = router.match('GET', '/123/456')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('foo')
    expect(res[0][1]['id']).toBe('123')
  })

  it('parent', () => {
    const router = new LinearRouter<string>()
    router.add('GET', '/:id/:action', 'foo')
    router.add('GET', '/posts/:id', 'bar')
    const [res] = router.match('GET', '/posts/get')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('foo')
    expect(res[0][1]['id']).toBe('posts')
    expect(res[0][1]['action']).toBe('get')
    expect(res[1][0]).toEqual('bar')
    expect(res[1][1]['id']).toBe('get')
  })

  it('child', () => {
    const router = new LinearRouter<string>()
    router.add('GET', '/posts/:id', 'foo')
    router.add('GET', '/:id/:action', 'bar')
    const [res] = router.match('GET', '/posts/get')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('foo')
    expect(res[0][1]['id']).toBe('get')
    expect(res[1][0]).toEqual('bar')
    expect(res[1][1]['id']).toBe('posts')
    expect(res[1][1]['action']).toBe('get')
  })
})

describe('Routing with a hostname', () => {
  const router = new LinearRouter<string>()
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
