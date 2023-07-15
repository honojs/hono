import { PatternRouter } from './router.ts'

describe('Basic', () => {
  const router = new PatternRouter<string>()
  router.add('GET', '/hello', 'get hello')
  router.add('POST', '/hello', 'post hello')
  router.add('PURGE', '/hello', 'purge hello')

  it('get, post, purge hello', async () => {
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
  const router = new PatternRouter<string>()

  it('Named Param', async () => {
    router.add('GET', '/entry/:id', 'get entry')
    const res = router.match('GET', '/entry/123')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get entry'])
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
  const router = new PatternRouter<string>()
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
  const router = new PatternRouter<string>()
  router.add('GET', '/page', 'page')
  router.add('ALL', '*', 'fallback') // or '*'
  it('GET /page', async () => {
    const res = router.match('GET', '/page')
    expect(res?.handlers).toEqual(['page', 'fallback'])
  })
})

describe('Optional route', () => {
  const router = new PatternRouter<string>()
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
  const router = new PatternRouter<string>()
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

describe('Trailing slash', () => {
  const router = new PatternRouter<string>()
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
  const router = new PatternRouter<string>()
  router.add('GET', '/hey', 'Middleware A')
  router.add('GET', '/hey', 'Middleware B')
  it('GET /hey', () => {
    const res = router.match('GET', '/hey')
    expect(res?.handlers).toEqual(['Middleware A', 'Middleware B'])
  })
})

describe('Including slashes', () => {
  const router = new PatternRouter<string>()
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
  const router = new PatternRouter<string>()
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

describe('Duplicate param name', () => {
  it('self', () => {
    const router = new PatternRouter<string>()
    expect(() => {
      router.add('GET', '/:id/:id', 'foo')
    }).toThrowError(/Duplicate param name/)
  })

  it('parent', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/:id/:action', 'foo')
    expect(() => {
      router.add('get', '/posts/:id', 'bar')
    }).toThrowError(/Duplicate param name/)
  })

  it('child', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/posts/:id', 'foo')
    expect(() => {
      router.add('get', '/:id/:action', 'bar')
    }).toThrowError(/Duplicate param name/)
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
      const res = router.match('get', '/page')
      expect(res?.handlers).toEqual(['a', '/page', '/:slug'])
    })
  })

  describe('With Named path', () => {
    const router = new PatternRouter<string>()
    router.add('get', '*', 'a')
    router.add('get', '/posts/:id', '/posts/:id')
    router.add('get', '/:type/:id', '/:type/:id')

    it('get /posts/123', () => {
      const res = router.match('get', '/posts/123')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['a', '/posts/:id', '/:type/:id'])
    })
  })

  describe('With Wildcards', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/api/*', '1st')
    router.add('get', '/api/*', '2nd')
    router.add('get', '/api/posts/:id', '3rd')
    router.add('get', '/api/*', '4th')

    it('get /api/posts/123', () => {
      const res = router.match('get', '/api/posts/123')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['1st', '2nd', '3rd', '4th'])
    })
  })

  describe('With special Wildcard', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/posts', '/posts') // 1.1
    router.add('get', '/posts/*', '/posts/*') // 1.2
    router.add('get', '/posts/:id', '/posts/:id') // 2.3

    it('get /posts', () => {
      const res = router.match('get', '/posts')

      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['/posts', '/posts/*'])
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
      const res = router.match('get', '/api/posts/123')
      expect(res?.handlers).toEqual(['b', 'd', 'e', 'f', 'g', 'i', 'j'])
    })
  })

  describe('Multi match', () => {
    const router = new PatternRouter<string>()
    router.add('get', '*', 'GET *') // 0.1
    router.add('get', '/abc/*', 'GET /abc/*') // 1.2
    router.add('get', '/abc/edf', 'GET /abc/edf') // 2.3
    router.add('get', '/abc/*/ghi/jkl', 'GET /abc/*/ghi/jkl') // 4.4
    it('get /abc/edf', () => {
      const res = router.match('get', '/abc/edf')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['GET *', 'GET /abc/*', 'GET /abc/edf'])
    })
  })

  describe('Multi match', () => {
    const router = new PatternRouter<string>()

    router.add('get', '/api/*', 'a') // 2.1 for /api/entry
    router.add('get', '/api/entry', 'entry') // 2.2
    router.add('ALL', '/api/*', 'b') // 2.3 for /api/entry

    it('get /api/entry', async () => {
      const res = router.match('get', '/api/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['a', 'entry', 'b'])
    })
  })

  describe('fallback', () => {
    describe('Blog - failed', () => {
      const router = new PatternRouter<string>()
      router.add('post', '/entry', 'post entry') // 1.1
      router.add('post', '/entry/*', 'fallback') // 1.2
      router.add('get', '/entry/:id', 'get entry') // 2.3
      it('post /entry', async () => {
        const res = router.match('post', '/entry')
        expect(res).not.toBeNull()
        expect(res?.handlers).toEqual(['post entry', 'fallback'])
      })
    })
  })
  describe('page', () => {
    const router = new PatternRouter<string>()
    router.add('get', '/page', 'page') // 1.1
    router.add('ALL', '/*', 'fallback') // 1.2
    it('get /page', async () => {
      const res = router.match('get', '/page')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['page', 'fallback'])
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

describe('Routing order With named parameters', () => {
  const router = new PatternRouter<string>()
  router.add('get', '/book/a', 'no-slug')
  router.add('get', '/book/:slug', 'slug')
  router.add('get', '/book/b', 'no-slug-b')
  it('/book/a', () => {
    const res = router.match('get', '/book/a')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['no-slug', 'slug'])
    expect(res?.params['slug']).toBe('a')
  })

  it('/book/foo', () => {
    const res = router.match('get', '/book/foo')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['slug'])
    expect(res?.params['slug']).toBe('foo')
  })
  it('/book/b', () => {
    const res = router.match('get', '/book/b')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['slug', 'no-slug-b'])
    expect(res?.params['slug']).toBe('b')
  })
})

describe('Routing with a hostname', () => {
  const router = new PatternRouter<string>()
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
