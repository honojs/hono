import { UnsupportedPathError } from '../../router'
import { PatternRouter } from './router'

describe('Basic', () => {
  const router = new PatternRouter<string>()
  router.add('GET', '/hello', 'get hello')
  router.add('POST', '/hello', 'post hello')
  router.add('PURGE', '/hello', 'purge hello')

  it('get, post, purge hello', async () => {
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
  const router = new PatternRouter<string>()

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
  const router = new PatternRouter<string>()

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
      expect(res[1][1]).toEqual({})
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

describe('Fallback', () => {
  const router = new PatternRouter<string>()
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
  const router = new PatternRouter<string>()
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
  const router = new PatternRouter<string>()
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
  const router = new PatternRouter<string>()
  router.add('GET', '/book/a', 'no-slug')
  router.add('GET', '/book/:slug', 'slug')
  router.add('GET', '/book/b', 'no-slug-b')
  it('GET /book/a', async () => {
    const [res] = router.match('GET', '/book/a')
    expect(res[0][0]).toEqual('no-slug')
    expect(res[0][1]).toEqual({})
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
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('slug')
    expect(res[0][1]['slug']).toBe('b')
    expect(res[1][0]).toEqual('no-slug-b')
    expect(res[1][1]).toEqual({})
  })
})

describe('Trailing slash', () => {
  const router = new PatternRouter<string>()
  router.add('GET', '/book', 'GET /book')
  router.add('GET', '/book/:id', 'GET /book/:id')
  it('GET /book', () => {
    const [res] = router.match('GET', '/book')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('GET /book')
  })
  it('GET /book/', () => {
    const [res] = router.match('GET', '/book/')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('GET /book')
  })
})

describe('Same path', () => {
  const router = new PatternRouter<string>()
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
  const router = new PatternRouter<string>()
  router.add('GET', '/js/:filename{[a-z0-9/]+.js}', 'any file')
  router.add('GET', '/js/main.js', 'main.js')

  it('GET /js/main.js', () => {
    const [res] = router.match('GET', '/js/main.js')
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
  const router = new PatternRouter<string>()
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

describe('Duplicate param name', () => {
  it('self', () => {
    const router = new PatternRouter<string>()
    expect(() => {
      router.add('GET', '/:id/:id', 'foo')
    }).toThrowError(UnsupportedPathError)
  })

  it('parent', () => {
    const router = new PatternRouter<string>()
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
    const router = new PatternRouter<string>()
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

  it('hierarchy', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/posts/:id/comments/:comment_id', 'foo')
    expect(() => {
      router.add('get', '/posts/:id', 'bar')
    }).not.toThrowError()
  })

  it('regular expression', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/:id/:action{create|update}', 'foo')
    expect(() => {
      router.add('get', '/:id/:action{delete}', 'bar')
    }).not.toThrowError()
  })
})

describe('Sort Order', () => {
  describe('Basic', () => {
    const router = new PatternRouter<string>()
    router.add('get', '*', 'a')
    router.add('get', '/page', '/page')
    router.add('get', '/:slug', '/:slug')

    it('get /page', () => {
      const [res] = router.match('get', '/page')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('a')
      expect(res[1][0]).toEqual('/page')
      expect(res[2][0]).toEqual('/:slug')
    })
  })

  describe('With Named path', () => {
    const router = new PatternRouter<string>()
    router.add('get', '*', 'a')
    router.add('get', '/posts/:id', '/posts/:id')
    router.add('get', '/:type/:id', '/:type/:id')

    it('get /posts/123', () => {
      const [res] = router.match('get', '/posts/123')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('a')
      expect(res[1][0]).toEqual('/posts/:id')
      expect(res[2][0]).toEqual('/:type/:id')
    })
  })

  describe('With Wildcards', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/api/*', '1st')
    router.add('get', '/api/*', '2nd')
    router.add('get', '/api/posts/:id', '3rd')
    router.add('get', '/api/*', '4th')

    it('get /api/posts/123', () => {
      const [res] = router.match('get', '/api/posts/123')
      expect(res.length).toBe(4)
      expect(res[0][0]).toEqual('1st')
      expect(res[1][0]).toEqual('2nd')
      expect(res[2][0]).toEqual('3rd')
      expect(res[3][0]).toEqual('4th')
    })
  })

  describe('With special Wildcard', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/posts', '/posts') // 1.1
    router.add('get', '/posts/*', '/posts/*') // 1.2
    router.add('get', '/posts/:id', '/posts/:id') // 2.3

    it('get /posts', () => {
      const [res] = router.match('get', '/posts')

      expect(res.length).toBe(2)
      expect(res[0][0]).toEqual('/posts')
      expect(res[1][0]).toEqual('/posts/*')
    })
  })

  describe('Complex', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/api', 'a') // not match
    router.add('get', '/api/*', 'b') // match
    router.add('get', '/api/:type', 'c') // not match
    router.add('get', '/api/:type/:id', 'd') // match
    router.add('get', '/api/posts/:id', 'e') // match
    router.add('get', '/api/posts/123', 'f') // match
    router.add('get', '/*/*/:id', 'g') // match
    router.add('get', '/api/posts/*/comment', 'h') // not match
    router.add('get', '*', 'i') // match
    router.add('get', '*', 'j') // match

    it('get /api/posts/123', () => {
      const [res] = router.match('get', '/api/posts/123')
      expect(res.length).toBe(7)
      expect(res[0][0]).toEqual('b')
      expect(res[1][0]).toEqual('d')
      expect(res[2][0]).toEqual('e')
      expect(res[3][0]).toEqual('f')
      expect(res[4][0]).toEqual('g')
      expect(res[5][0]).toEqual('i')
      expect(res[6][0]).toEqual('j')
    })
  })

  describe('Multi match', () => {
    const router = new PatternRouter<string>()
    router.add('get', '*', 'GET *') // 0.1
    router.add('get', '/abc/*', 'GET /abc/*') // 1.2
    router.add('get', '/abc/edf', 'GET /abc/edf') // 2.3
    router.add('get', '/abc/*/ghi/jkl', 'GET /abc/*/ghi/jkl') // 4.4
    it('get /abc/edf', () => {
      const [res] = router.match('get', '/abc/edf')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('GET *')
      expect(res[1][0]).toEqual('GET /abc/*')
      expect(res[2][0]).toEqual('GET /abc/edf')
    })
  })

  describe('Multi match', () => {
    const router = new PatternRouter<string>()

    router.add('get', '/api/*', 'a') // 2.1 for /api/entry
    router.add('get', '/api/entry', 'entry') // 2.2
    router.add('ALL', '/api/*', 'b') // 2.3 for /api/entry

    it('get /api/entry', async () => {
      const [res] = router.match('get', '/api/entry')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('a')
      expect(res[1][0]).toEqual('entry')
      expect(res[2][0]).toEqual('b')
    })
  })

  describe('fallback', () => {
    describe('Blog - failed', () => {
      const router = new PatternRouter<string>()
      router.add('post', '/entry', 'post entry') // 1.1
      router.add('post', '/entry/*', 'fallback') // 1.2
      router.add('get', '/entry/:id', 'get entry') // 2.3
      it('post /entry', async () => {
        const [res] = router.match('post', '/entry')
        expect(res.length).toBe(2)
        expect(res[0][0]).toEqual('post entry')
        expect(res[1][0]).toEqual('fallback')
      })
    })
  })
  describe('page', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/page', 'page') // 1.1
    router.add('ALL', '/*', 'fallback') // 1.2
    it('get /page', async () => {
      const [res] = router.match('get', '/page')
      expect(res.length).toBe(2)
      expect(res[0][0]).toEqual('page')
      expect(res[1][0]).toEqual('fallback')
    })
  })
})

describe('star', () => {
  const router = new PatternRouter<string>()
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

describe('Routing order With named parameters', () => {
  const router = new PatternRouter<string>()
  router.add('get', '/book/a', 'no-slug')
  router.add('get', '/book/:slug', 'slug')
  router.add('get', '/book/b', 'no-slug-b')
  it('/book/a', () => {
    const [res] = router.match('get', '/book/a')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('no-slug')
    expect(res[0][1]).toEqual({})
    expect(res[1][0]).toEqual('slug')
    expect(res[1][1]['slug']).toBe('a')
  })

  it('/book/foo', () => {
    const [res] = router.match('get', '/book/foo')
    expect(res.length).toBe(1)
    expect(res[0][0]).toEqual('slug')
    expect(res[0][1]['slug']).toBe('foo')
  })
  it('/book/b', () => {
    const [res] = router.match('get', '/book/b')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('slug')
    expect(res[0][1]['slug']).toBe('b')
    expect(res[1][0]).toEqual('no-slug-b')
    expect(res[1][1]).toEqual({})
  })
})

describe('Routing with a hostname', () => {
  const router = new PatternRouter<string>()
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
