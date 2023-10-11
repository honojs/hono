import { UnsupportedPathError } from '../../router'
import { RegExpRouter } from './router'

describe('Basic Usage', () => {
  const router = new RegExpRouter<string>()

  router.add('GET', '/hello', 'get hello')
  router.add('POST', '/hello', 'post hello')
  router.add('PURGE', '/hello', 'purge hello')

  it('get, post hello', async () => {
    let res = router.match('GET', '/hello')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('get hello')

    res = router.match('POST', '/hello')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('post hello')

    res = router.match('PURGE', '/hello')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('purge hello')

    res = router.match('PUT', '/hello')
    expect(res.length).toBe(0)

    res = router.match('GET', '/')
    expect(res.length).toBe(0)
  })
})

describe('Complex', () => {
  let router: RegExpRouter<string>
  beforeEach(() => {
    router = new RegExpRouter<string>()
  })

  it('Named Param', async () => {
    router.add('GET', '/entry/:id', 'get entry')
    const res = router.match('GET', '/entry/123')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('get entry')
    expect(res[0].params['id']).toBe('123')
  })

  it('Wildcard', async () => {
    router.add('GET', '/wild/*/card', 'get wildcard')
    const res = router.match('GET', '/wild/xxx/card')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('get wildcard')
  })

  it('Default', async () => {
    router.add('GET', '/api/abc', 'get api')
    router.add('GET', '/api/*', 'fallback')
    let res = router.match('GET', '/api/abc')
    expect(res.length).toBe(2)
    expect(res[0].handler).toEqual('get api')
    expect(res[1].handler).toEqual('fallback')
    res = router.match('GET', '/api/def')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('fallback')
  })

  it('Regexp', async () => {
    router.add('GET', '/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
    let res = router.match('GET', '/post/20210101/hello')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('get post')
    expect(res[0].params['date']).toBe('20210101')
    expect(res[0].params['title']).toBe('hello')
    res = router.match('GET', '/post/onetwothree')
    expect(res.length).toBe(0)
    res = router.match('GET', '/post/123/123')
    expect(res.length).toBe(0)
  })

  it('/*', async () => {
    router.add('GET', '/api/*', 'auth middleware')
    router.add('GET', '/api', 'top')
    router.add('GET', '/api/posts', 'posts')
    router.add('GET', '/api/*', 'fallback')

    let res = router.match('GET', '/api')
    expect(res.length).toBe(3)
    expect(res[0].handler).toEqual('auth middleware')
    expect(res[1].handler).toEqual('top')
    expect(res[2].handler).toEqual('fallback')

    res = router.match('GET', '/api/posts')
    expect(res.length).toBe(3)
    expect(res[0].handler).toEqual('auth middleware')
    expect(res[1].handler).toEqual('posts')
    expect(res[2].handler).toEqual('fallback')
  })
})

describe('Registration order', () => {
  let router: RegExpRouter<string>
  beforeEach(() => {
    router = new RegExpRouter<string>()
  })

  it('middleware -> handler', async () => {
    router.add('GET', '*', 'bar')
    router.add('GET', '/:type/:action', 'foo')
    const res = router.match('GET', '/posts/123')
    expect(res.length).toBe(2)
    expect(res[0].handler).toEqual('bar')
    expect(res[1].handler).toEqual('foo')
  })

  it('handler -> fallback', async () => {
    router.add('GET', '/:type/:action', 'foo')
    router.add('GET', '*', 'fallback')
    const res = router.match('GET', '/posts/123')
    expect(res.length).toBe(2)
    expect(res[0].handler).toEqual('foo')
    expect(res[1].handler).toEqual('fallback')
  })
})

describe('Multi match', () => {
  describe('Blog', () => {
    const router = new RegExpRouter<string>()

    router.add('ALL', '*', 'middleware a')
    router.add('GET', '*', 'middleware b')
    router.add('GET', '/entry', 'get entries')
    router.add('POST', '/entry/*', 'middleware c')
    router.add('POST', '/entry', 'post entry')
    router.add('GET', '/entry/:id', 'get entry')
    router.add('GET', '/entry/:id/comment/:comment_id', 'get comment')
    it('GET /', async () => {
      const res = router.match('GET', '/')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('middleware a')
      expect(res[1].handler).toEqual('middleware b')
    })
    it('GET /entry/123', async () => {
      const res = router.match('GET', '/entry/123')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('middleware a')
      expect(res[0].params['id']).toBe(undefined)
      expect(res[1].handler).toEqual('middleware b')
      expect(res[1].params['id']).toBe(undefined)
      expect(res[2].handler).toEqual('get entry')
      expect(res[2].params['id']).toBe('123')
    })
    it('GET /entry/123/comment/456', async () => {
      const res = router.match('GET', '/entry/123/comment/456')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('middleware a')
      expect(res[0].params['id']).toBe(undefined)
      expect(res[0].params['comment_id']).toBe(undefined)
      expect(res[1].handler).toEqual('middleware b')
      expect(res[1].params['id']).toBe(undefined)
      expect(res[1].params['comment_id']).toBe(undefined)
      expect(res[2].handler).toEqual('get comment')
      expect(res[2].params['id']).toBe('123')
      expect(res[2].params['comment_id']).toBe('456')
    })
    it('POST /entry', async () => {
      const res = router.match('POST', '/entry')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('middleware a')
      expect(res[1].handler).toEqual('middleware c')
      expect(res[2].handler).toEqual('post entry')
    })
    it('DELETE /entry', async () => {
      const res = router.match('DELETE', '/entry')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('middleware a')
    })
  })

  it('hierarchy', () => {
    const router = new RegExpRouter<string>()
    router.add('GET', '/posts/:id/comments/:comment_id', 'foo')
    router.add('GET', '/posts/:id', 'bar')
    expect(() => {
      router.match('GET', '/')
    }).not.toThrow()
  })
})

describe('Check for duplicate parameter names', () => {
  it('self', () => {
    const router = new RegExpRouter<string>()
    router.add('GET', '/:id/:id', 'get')
    expect(() => {
      router.match('GET', '/') // check parameter names on the first `match` call
    }).toThrowError(/Duplicate param name/)
  })
})

describe('UnsupportedPathError', () => {
  describe('Ambiguous', () => {
    const router = new RegExpRouter<string>()

    router.add('GET', '/:user/entries', 'get user entries')
    router.add('GET', '/entry/:name', 'get entry')
    router.add('POST', '/entry', 'create entry')

    it('GET /entry/entries', async () => {
      expect(() => {
        router.match('GET', '/entry/entries')
      }).toThrowError(UnsupportedPathError)
    })
  })

  describe('Multiple handlers with different label', () => {
    const router = new RegExpRouter<string>()

    router.add('GET', '/:type/:id', ':type')
    router.add('GET', '/:class/:id', ':class')
    router.add('GET', '/:model/:id', ':model')

    it('GET /entry/123', async () => {
      expect(() => {
        router.match('GET', '/entry/123')
      }).toThrowError(UnsupportedPathError)
    })
  })

  it('parent', () => {
    const router = new RegExpRouter<string>()
    router.add('GET', '/:id/:action', 'foo')
    router.add('GET', '/posts/:id', 'bar')
    expect(() => {
      router.match('GET', '/')
    }).toThrowError(UnsupportedPathError)
  })

  it('child', () => {
    const router = new RegExpRouter<string>()
    router.add('GET', '/posts/:id', 'foo')
    router.add('GET', '/:id/:action', 'bar')

    expect(() => {
      router.match('GET', '/')
    }).toThrowError(UnsupportedPathError)
  })

  describe('static and dynamic', () => {
    it('static first', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/reg-exp/router', 'foo')
      router.add('GET', '/reg-exp/:id', 'bar')

      expect(() => {
        router.match('GET', '/')
      }).toThrowError(UnsupportedPathError)
    })

    it('long label', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/reg-exp/router', 'foo')
      router.add('GET', '/reg-exp/:service', 'bar')

      expect(() => {
        router.match('GET', '/')
      }).toThrowError(UnsupportedPathError)
    })

    it('dynamic first', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/reg-exp/:id', 'bar')
      router.add('GET', '/reg-exp/router', 'foo')

      expect(() => {
        router.match('GET', '/')
      }).toThrowError(UnsupportedPathError)
    })
  })

  it('different regular expression', () => {
    const router = new RegExpRouter<string>()
    router.add('GET', '/:id/:action{create|update}', 'foo')
    router.add('GET', '/:id/:action{delete}', 'bar')
    expect(() => {
      router.match('GET', '/')
    }).toThrowError(UnsupportedPathError)
  })
})

describe('star', () => {
  const router = new RegExpRouter<string>()

  router.add('GET', '/', '/')
  router.add('GET', '/*', '/*')
  router.add('GET', '*', '*')

  router.add('GET', '/x', '/x')
  router.add('GET', '/x/*', '/x/*')

  it('top', async () => {
    const res = router.match('GET', '/')
    expect(res.length).toBe(3)
    expect(res[0].handler).toEqual('/')
    expect(res[1].handler).toEqual('/*')
    expect(res[2].handler).toEqual('*')
  })

  it('Under a certain path', async () => {
    const res = router.match('GET', '/x')
    expect(res.length).toBe(4)
    expect(res[0].handler).toEqual('/*')
    expect(res[1].handler).toEqual('*')
    expect(res[2].handler).toEqual('/x')
    expect(res[3].handler).toEqual('/x/*')
  })
})

describe('Optional route', () => {
  const router = new RegExpRouter<string>()
  router.add('GET', '/api/animals/:type?', 'animals')
  it('GET /api/animals/dog', async () => {
    const res = router.match('GET', '/api/animals/dog')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('animals')
    expect(res[0].params['type']).toBe('dog')
  })
  it('GET /api/animals', async () => {
    const res = router.match('GET', '/api/animals')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('animals')
    expect(res[0].params['type']).toBeUndefined()
  })
})

describe('All', () => {
  const router = new RegExpRouter<string>()

  router.add('GET', '/hello', 'get hello')
  router.add('ALL', '/all', 'get all')

  it('get, all hello', async () => {
    const res = router.match('GET', '/all')
    expect(res.length).toBe(1)
  })
})

describe('long prefix, then star', () => {
  describe('GET only', () => {
    const router = new RegExpRouter<string>()

    router.add('GET', '/long/prefix/*', 'long-prefix')
    router.add('GET', '/long/*', 'long')
    router.add('GET', '*', 'star1')
    router.add('GET', '*', 'star2')

    it('get /', () => {
      const res = router.match('GET', '/')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('star1')
      expect(res[1].handler).toEqual('star2')
    })

    it('get /long/prefix', () => {
      const res = router.match('GET', '/long/prefix')
      expect(res.length).toBe(4)
      expect(res[0].handler).toEqual('long-prefix')
      expect(res[1].handler).toEqual('long')
      expect(res[2].handler).toEqual('star1')
      expect(res[3].handler).toEqual('star2')
    })

    it('get /long/prefix/test', () => {
      const res = router.match('GET', '/long/prefix/test')
      expect(res.length).toBe(4)
      expect(res[0].handler).toEqual('long-prefix')
      expect(res[1].handler).toEqual('long')
      expect(res[2].handler).toEqual('star1')
      expect(res[3].handler).toEqual('star2')
    })
  })

  describe('ALL and GET', () => {
    const router = new RegExpRouter<string>()

    router.add('ALL', '/long/prefix/*', 'long-prefix')
    router.add('ALL', '/long/*', 'long')
    router.add('GET', '*', 'star1')
    router.add('GET', '*', 'star2')

    it('get /', () => {
      const res = router.match('GET', '/')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('star1')
      expect(res[1].handler).toEqual('star2')
    })

    it('get /long/prefix', () => {
      const res = router.match('GET', '/long/prefix')
      expect(res.length).toBe(4)
      expect(res[0].handler).toEqual('long-prefix')
      expect(res[1].handler).toEqual('long')
      expect(res[2].handler).toEqual('star1')
      expect(res[3].handler).toEqual('star2')
    })

    it('get /long/prefix/test', () => {
      const res = router.match('GET', '/long/prefix/test')
      expect(res.length).toBe(4)
      expect(res[0].handler).toEqual('long-prefix')
      expect(res[1].handler).toEqual('long')
      expect(res[2].handler).toEqual('star1')
      expect(res[3].handler).toEqual('star2')
    })
  })

  describe('Including slashes', () => {
    const router = new RegExpRouter<string>()

    router.add('GET', '/js/:filename{[a-z0-9/]+.js}', 'any file')

    // XXX This route can not be added with `:label` to RegExpRouter. This is ambiguous.
    // router.add('GET', '/js/main.js', 'main.js')
    // it('get /js/main.js', () => {
    //   const res = router.match('GET', '/js/main.js')
    //   expect(res.length).toBe(1)
    //   expect(res[0].handler).toEqual('any file', 'main.js')
    //   expect(res[0].params).toEqual({ filename: 'main.js' })
    // })

    it('get /js/chunk/123.js', () => {
      const res = router.match('GET', '/js/chunk/123.js')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('any file')
      expect(res[0].params).toEqual({ filename: 'chunk/123.js' })
    })

    it('get /js/chunk/nest/123.js', () => {
      const res = router.match('GET', '/js/chunk/nest/123.js')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('any file')
      expect(res[0].params).toEqual({ filename: 'chunk/nest/123.js' })
    })
  })

  describe('REST API', () => {
    const router = new RegExpRouter<string>()

    router.add('GET', '/users/:username{[a-z]+}', 'profile')
    router.add('GET', '/users/:username{[a-z]+}/posts', 'posts')

    it('get /users/hono', () => {
      const res = router.match('GET', '/users/hono')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('profile')
    })

    it('get /users/hono/posts', () => {
      const res = router.match('GET', '/users/hono/posts')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('posts')
    })
  })
})

describe('static routes of ALL and GET', () => {
  const router = new RegExpRouter<string>()

  router.add('ALL', '/foo', 'foo')
  router.add('GET', '/bar', 'bar')

  it('get /foo', () => {
    const res = router.match('GET', '/foo')
    expect(res[0].handler).toEqual('foo')
  })
})

describe('ALL and Star', () => {
  const router = new RegExpRouter<string>()

  router.add('ALL', '/x', '/x')
  router.add('GET', '*', 'star')

  it('Should return /x and star', async () => {
    const res = router.match('GET', '/x')
    expect(res.length).toBe(2)
    expect(res[0].handler).toEqual('/x')
    expect(res[1].handler).toEqual('star')
  })
})

describe('GET star, ALL static, GET star...', () => {
  const router = new RegExpRouter<string>()

  router.add('GET', '*', 'star1')
  router.add('ALL', '/x', '/x')
  router.add('GET', '*', 'star2')
  router.add('GET', '*', 'star3')

  it('Should return /x and star', async () => {
    const res = router.match('GET', '/x')
    expect(res.length).toBe(4)
    expect(res[0].handler).toEqual('star1')
    expect(res[1].handler).toEqual('/x')
    expect(res[2].handler).toEqual('star2')
    expect(res[3].handler).toEqual('star3')
  })
})

// https://github.com/honojs/hono/issues/699
describe('GET star, GET static, ALL star...', () => {
  const router = new RegExpRouter<string>()

  router.add('GET', '/y/*', 'star1')
  router.add('GET', '/y/a', 'a')
  router.add('ALL', '/y/b/*', 'star2')
  router.add('GET', '/y/b/bar', 'bar')

  it('Should return star1, star2, and bar', async () => {
    const res = router.match('GET', '/y/b/bar')
    expect(res.length).toBe(3)
    expect(res[0].handler).toEqual('star1')
    expect(res[1].handler).toEqual('star2')
    expect(res[2].handler).toEqual('bar')
  })
})

describe('ALL star, ALL star, GET static, ALL star...', () => {
  const router = new RegExpRouter<string>()

  router.add('ALL', '*', 'wildcard')
  router.add('ALL', '/a/*', 'star1')
  router.add('GET', '/a/foo', 'foo')
  router.add('ALL', '/b/*', 'star2')
  router.add('GET', '/b/bar', 'bar')

  it('Should return wildcard, star2 and bar', async () => {
    const res = router.match('GET', '/b/bar')
    expect(res.length).toBe(3)
    expect(res[0].handler).toEqual('wildcard')
    expect(res[1].handler).toEqual('star2')
    expect(res[2].handler).toEqual('bar')
  })
})

describe('Routing with a hostname', () => {
  const router = new RegExpRouter<string>()
  router.add('get', 'www1.example.com/hello', 'www1')
  router.add('get', 'www2.example.com/hello', 'www2')
  it('GET www1.example.com/hello', () => {
    const res = router.match('get', 'www1.example.com/hello')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('www1')
  })
  it('GET www2.example.com/hello', () => {
    const res = router.match('get', 'www2.example.com/hello')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('www2')
  })
  it('GET /hello', () => {
    const res = router.match('get', '/hello')
    expect(res.length).toBe(0)
  })
})
