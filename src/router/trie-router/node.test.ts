import { Node } from './node'

describe('Root Node', () => {
  const node = new Node()
  node.insert('get', '/', 'get root')
  it('get /', () => {
    const res = node.search('get', '/')
    expect(res).not.toBeNull()
    expect(res[0].handler).toEqual('get root')
    expect(node.search('get', '/hello').length).toBe(0)
  })
})

describe('Root Node is not defined', () => {
  const node = new Node()
  node.insert('get', '/hello', 'get hello')
  it('get /', () => {
    expect(node.search('get', '/')).toEqual([])
  })
})

describe('Get with *', () => {
  const node = new Node()
  node.insert('get', '*', 'get all')
  it('get /', () => {
    expect(node.search('get', '/').length).toBe(1)
    expect(node.search('get', '/hello').length).toBe(1)
  })
})

describe('Basic Usage', () => {
  const node = new Node()
  node.insert('get', '/hello', 'get hello')
  node.insert('post', '/hello', 'post hello')
  node.insert('get', '/hello/foo', 'get hello foo')

  it('get, post /hello', () => {
    expect(node.search('get', '/').length).toBe(0)
    expect(node.search('post', '/').length).toBe(0)

    expect(node.search('get', '/hello')[0].handler).toEqual('get hello')
    expect(node.search('post', '/hello')[0].handler).toEqual('post hello')
    expect(node.search('put', '/hello').length).toBe(0)
  })
  it('get /nothing', () => {
    expect(node.search('get', '/nothing').length).toBe(0)
  })
  it('/hello/foo, /hello/bar', () => {
    expect(node.search('get', '/hello/foo')[0].handler).toEqual('get hello foo')
    expect(node.search('post', '/hello/foo').length).toBe(0)
    expect(node.search('get', '/hello/bar').length).toBe(0)
  })
  it('/hello/foo/bar', () => {
    expect(node.search('get', '/hello/foo/bar').length).toBe(0)
  })
})

describe('Name path', () => {
  const node = new Node()
  node.insert('get', '/entry/:id', 'get entry')
  node.insert('get', '/entry/:id/comment/:comment_id', 'get comment')
  node.insert('get', '/map/:location/events', 'get events')

  it('get /entry/123', () => {
    const res = node.search('get', '/entry/123')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('get entry')
    expect(res[0].params).not.toBeNull()
    expect(res[0].params['id']).toBe('123')
    expect(res[0].params['id']).not.toBe('1234')
  })

  it('get /entry/456/comment', () => {
    const res = node.search('get', '/entry/456/comment')
    expect(res.length).toBe(0)
  })

  it('get /entry/789/comment/123', () => {
    const res = node.search('get', '/entry/789/comment/123')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('get comment')
    expect(res[0].params['id']).toBe('789')
    expect(res[0].params['comment_id']).toBe('123')
  })

  it('get /map/:location/events', () => {
    const res = node.search('get', '/map/yokohama/events')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('get events')
    expect(res[0].params['location']).toBe('yokohama')
  })
})

describe('Name path - Multiple route', () => {
  const node = new Node()

  node.insert('get', '/:type/:id', 'common')
  node.insert('get', '/posts/:id', 'specialized')

  it('get /posts/123', () => {
    const res = node.search('get', '/posts/123')
    expect(res.length).toBe(2)
    expect(res[0].handler).toEqual('common')
    expect(res[0].params['id']).toBe('123')
    expect(res[1].handler).toEqual('specialized')
    expect(res[1].params['id']).toBe('123')
  })
})

describe('Param prefix', () => {
  const node = new Node()

  node.insert('get', '/:foo', 'onepart')
  node.insert('get', '/:bar/:baz', 'twopart')

  it('get /hello', () => {
    const res = node.search('get', '/hello')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('onepart')
    expect(res[0].params['foo']).toBe('hello')
  })

  it('get /hello/world', () => {
    const res = node.search('get', '/hello/world')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('twopart')
    expect(res[0].params['bar']).toBe('hello')
    expect(res[0].params['baz']).toBe('world')
  })
})

describe('Named params and a wildcard', () => {
  const node = new Node()

  node.insert('get', '/:id/*', 'onepart')

  it('get /', () => {
    const res = node.search('get', '/')
    expect(res.length).toBe(0)
  })

  it('get /foo', () => {
    const res = node.search('get', '/foo')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('onepart')
    expect(res[0].params['id']).toEqual('foo')
  })

  it('get /foo/bar', () => {
    const res = node.search('get', '/foo/bar')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('onepart')
    expect(res[0].params['id']).toEqual('foo')
  })
})

describe('Wildcard', () => {
  const node = new Node()
  node.insert('get', '/wildcard-abc/*/wildcard-efg', 'wildcard')
  it('/wildcard-abc/xxxxxx/wildcard-efg', () => {
    const res = node.search('get', '/wildcard-abc/xxxxxx/wildcard-efg')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('wildcard')
  })
  node.insert('get', '/wildcard-abc/*/wildcard-efg/hijk', 'wildcard')
  it('/wildcard-abc/xxxxxx/wildcard-efg/hijk', () => {
    const res = node.search('get', '/wildcard-abc/xxxxxx/wildcard-efg/hijk')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('wildcard')
  })
})

describe('Regexp', () => {
  const node = new Node()
  node.insert('get', '/regex-abc/:id{[0-9]+}/comment/:comment_id{[a-z]+}', 'regexp')
  it('/regexp-abc/123/comment/abc', () => {
    const res = node.search('get', '/regex-abc/123/comment/abc')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('regexp')
    expect(res[0].params['id']).toBe('123')
    expect(res[0].params['comment_id']).toBe('abc')
  })
  it('/regexp-abc/abc', () => {
    const res = node.search('get', '/regex-abc/abc')
    expect(res.length).toBe(0)
  })
  it('/regexp-abc/123/comment/123', () => {
    const res = node.search('get', '/regex-abc/123/comment/123')
    expect(res.length).toBe(0)
  })
})

describe('All', () => {
  const node = new Node()
  node.insert('ALL', '/all-methods', 'all methods') // ALL
  it('/all-methods', () => {
    let res = node.search('get', '/all-methods')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('all methods')
    res = node.search('put', '/all-methods')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('all methods')
  })
})

describe('Special Wildcard', () => {
  const node = new Node()
  node.insert('ALL', '*', 'match all')

  it('/foo', () => {
    const res = node.search('get', '/foo')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('match all')
  })
  it('/hello', () => {
    const res = node.search('get', '/hello')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('match all')
  })
  it('/hello/foo', () => {
    const res = node.search('get', '/hello/foo')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('match all')
  })
})

describe('Special Wildcard deeply', () => {
  const node = new Node()
  node.insert('ALL', '/hello/*', 'match hello')
  it('/hello', () => {
    const res = node.search('get', '/hello')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('match hello')
  })
  it('/hello/foo', () => {
    const res = node.search('get', '/hello/foo')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('match hello')
  })
})

describe('Default with wildcard', () => {
  const node = new Node()
  node.insert('ALL', '/api/*', 'fallback')
  node.insert('ALL', '/api/abc', 'match api')
  it('/api/abc', () => {
    const res = node.search('get', '/api/abc')
    expect(res.length).toBe(2)
    expect(res[0].handler).toEqual('fallback')
    expect(res[1].handler).toEqual('match api')
  })
  it('/api/def', () => {
    const res = node.search('get', '/api/def')
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('fallback')
  })
})

describe('Multi match', () => {
  describe('Basic', () => {
    const node = new Node()
    node.insert('get', '*', 'GET *')
    node.insert('get', '/abc/*', 'GET /abc/*')
    node.insert('get', '/abc/*/edf', 'GET /abc/*/edf')
    node.insert('get', '/abc/edf', 'GET /abc/edf')
    node.insert('get', '/abc/*/ghi/jkl', 'GET /abc/*/ghi/jkl')
    it('get /abc/edf', () => {
      const res = node.search('get', '/abc/edf')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('GET *')
      expect(res[1].handler).toEqual('GET /abc/*')
      expect(res[2].handler).toEqual('GET /abc/edf')
    })
    it('get /abc/xxx/edf', () => {
      const res = node.search('get', '/abc/xxx/edf')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('GET *')
      expect(res[1].handler).toEqual('GET /abc/*')
      expect(res[2].handler).toEqual('GET /abc/*/edf')
    })
    it('get /', () => {
      const res = node.search('get', '/')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('GET *')
    })
    it('post /', () => {
      const res = node.search('post', '/')
      expect(res.length).toBe(0)
    })
    it('get /abc/edf/ghi', () => {
      const res = node.search('get', '/abc/edf/ghi')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('GET *')
      expect(res[1].handler).toEqual('GET /abc/*')
    })
  })
  describe('Blog', () => {
    const node = new Node()
    node.insert('get', '*', 'middleware a') // 0.1
    node.insert('ALL', '*', 'middleware b') // 0.2 <===
    node.insert('get', '/entry', 'get entries') // 1.3
    node.insert('post', '/entry/*', 'middleware c') // 1.4 <===
    node.insert('post', '/entry', 'post entry') // 1.5 <===
    node.insert('get', '/entry/:id', 'get entry') // 2.6
    node.insert('get', '/entry/:id/comment/:comment_id', 'get comment') // 4.7
    it('get /entry/123', async () => {
      const res = node.search('get', '/entry/123')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('middleware a')
      expect(res[0].params['id']).toBe(undefined)
      expect(res[1].handler).toEqual('middleware b')
      expect(res[1].params['id']).toBe(undefined)
      expect(res[2].handler).toEqual('get entry')
      expect(res[2].params['id']).toBe('123')
    })
    it('get /entry/123/comment/456', async () => {
      const res = node.search('get', '/entry/123/comment/456')
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
    it('post /entry', async () => {
      const res = node.search('post', '/entry')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('middleware b')
      expect(res[1].handler).toEqual('middleware c')
      expect(res[2].handler).toEqual('post entry')
    })
    it('delete /entry', async () => {
      const res = node.search('delete', '/entry')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('middleware b')
    })
  })
  describe('ALL', () => {
    const node = new Node()
    node.insert('ALL', '*', 'ALL *')
    node.insert('ALL', '/abc/*', 'ALL /abc/*')
    node.insert('ALL', '/abc/*/def', 'ALL /abc/*/def')
    it('get /', () => {
      const res = node.search('get', '/')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('ALL *')
    })
    it('post /abc', () => {
      const res = node.search('post', '/abc')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('ALL *')
      expect(res[1].handler).toEqual('ALL /abc/*')
    })
    it('delete /abc/xxx/def', () => {
      const res = node.search('post', '/abc/xxx/def')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('ALL *')
      expect(res[1].handler).toEqual('ALL /abc/*')
      expect(res[2].handler).toEqual('ALL /abc/*/def')
    })
  })
  describe('Regexp', () => {
    const node = new Node()
    node.insert('get', '/regex-abc/:id{[0-9]+}/*', 'middleware a')
    node.insert('get', '/regex-abc/:id{[0-9]+}/def', 'regexp')
    it('/regexp-abc/123/def', () => {
      const res = node.search('get', '/regex-abc/123/def')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('middleware a')
      expect(res[0].params['id']).toBe('123')
      expect(res[1].handler).toEqual('regexp')
      expect(res[1].params['id']).toBe('123')
    })
    it('/regexp-abc/123', () => {
      const res = node.search('get', '/regex-abc/123/ghi')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('middleware a')
    })
  })
  describe('Trailing slash', () => {
    const node = new Node()
    node.insert('get', '/book', 'GET /book')
    node.insert('get', '/book/:id', 'GET /book/:id')
    it('get /book', () => {
      const res = node.search('get', '/book')
      expect(res.length).toBe(1)
    })
    it('get /book/', () => {
      const res = node.search('get', '/book/')
      expect(res.length).toBe(0)
    })
  })
  describe('Same path', () => {
    const node = new Node()
    node.insert('get', '/hey', 'Middleware A')
    node.insert('get', '/hey', 'Middleware B')
    it('get /hey', () => {
      const res = node.search('get', '/hey')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('Middleware A')
      expect(res[1].handler).toEqual('Middleware B')
    })
  })
  describe('Including slashes', () => {
    const node = new Node()
    node.insert('get', '/js/:filename{[a-z0-9/]+.js}', 'any file')
    node.insert('get', '/js/main.js', 'main.js')
    it('get /js/main.js', () => {
      const res = node.search('get', '/js/main.js')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('any file')
      expect(res[0].params).toEqual({ filename: 'main.js' })
      expect(res[1].handler).toEqual('main.js')
      expect(res[1].params).toEqual({})
    })
    it('get /js/chunk/123.js', () => {
      const res = node.search('get', '/js/chunk/123.js')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('any file')
      expect(res[0].params).toEqual({ filename: 'chunk/123.js' })
    })
    it('get /js/chunk/nest/123.js', () => {
      const res = node.search('get', '/js/chunk/nest/123.js')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('any file')
      expect(res[0].params).toEqual({ filename: 'chunk/nest/123.js' })
    })
  })
  describe('REST API', () => {
    const node = new Node()
    node.insert('get', '/users/:username{[a-z]+}', 'profile')
    node.insert('get', '/users/:username{[a-z]+}/posts', 'posts')
    it('get /users/hono', () => {
      const res = node.search('get', '/users/hono')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('profile')
    })
    it('get /users/hono/posts', () => {
      const res = node.search('get', '/users/hono/posts')
      expect(res.length).toBe(1)
      expect(res[0].handler).toEqual('posts')
    })
  })
})

describe('Duplicate param name', () => {
  it('self', () => {
    const node = new Node()
    node.insert('get', '/:id/:id', 'foo')
    const res = node.search('get', '/123/456')
    expect(res.length).toBe(1)
    expect(res[0].handler).toBe('foo')
    expect(res[0].params['id']).toBe('123')
  })

  describe('parent', () => {
    const node = new Node()
    node.insert('get', '/:id/:action', 'foo')
    node.insert('get', '/posts/:id', 'bar')
    node.insert('get', '/posts/:id/comments/:comment_id', 'comment')

    it('get /123/action', () => {
      const res = node.search('get', '/123/action')
      expect(res.length).toBe(1)
      expect(res[0].handler).toBe('foo')
      expect(res[0].params).toEqual({ id: '123', action: 'action' })
    })

    it('get /posts/456', () => {
      const res = node.search('get', '/posts/456')
      expect(res.length).toBe(2)
      expect(res[0].handler).toBe('foo')
      expect(res[0].params).toEqual({ id: 'posts', action: '456' })
      expect(res[1].handler).toBe('bar')
      expect(res[1].params).toEqual({ id: '456' })

      it('get /posts/456', () => {
        const res = node.search('get', '/posts/abc/comments/edf')
        expect(res.length).toBe(1)
        expect(res[0].handler).toBe('comment')
        expect(res[0].params).toEqual({ id: 'abc', comment_id: 'edf' })
      })
    })
  })

  describe('child', () => {
    const node = new Node()
    node.insert('get', '/posts/:id', 'foo')
    node.insert('get', '/:id/:action', 'bar')
    it('get /posts/action', () => {
      const res = node.search('get', '/posts/action')
      expect(res.length).toBe(2)
      expect(res[0].handler).toBe('foo')
      expect(res[0].params).toEqual({ id: 'action' })
      expect(res[1].handler).toBe('bar')
      expect(res[1].params).toEqual({ id: 'posts', action: 'action' })
    })
  })

  describe('regular expression', () => {
    const node = new Node()
    node.insert('get', '/:id/:action{create|update}', 'foo')
    node.insert('get', '/:id/:action{delete}', 'bar')
    it('get /123/create', () => {
      const res = node.search('get', '/123/create')
      expect(res.length).toBe(1)
      expect(res[0].handler).toBe('foo')
      expect(res[0].params).toEqual({ id: '123', action: 'create' })
    })
    it('get /123/delete', () => {
      const res = node.search('get', '/123/delete')
      expect(res.length).toBe(1)
      expect(res[0].handler).toBe('bar')
      expect(res[0].params).toEqual({ id: '123', action: 'delete' })
    })
  })
})

describe('Sort Order', () => {
  describe('Basic', () => {
    const node = new Node()
    node.insert('get', '*', 'a')
    node.insert('get', '/page', '/page')
    node.insert('get', '/:slug', '/:slug')

    it('get /page', () => {
      const res = node.search('get', '/page')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('a')
      expect(res[1].handler).toEqual('/page')
      expect(res[2].handler).toEqual('/:slug')
    })
  })

  describe('With Named path', () => {
    const node = new Node()
    node.insert('get', '*', 'a')
    node.insert('get', '/posts/:id', '/posts/:id')
    node.insert('get', '/:type/:id', '/:type/:id')

    it('get /posts/123', () => {
      const res = node.search('get', '/posts/123')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('a')
      expect(res[1].handler).toEqual('/posts/:id')
      expect(res[2].handler).toEqual('/:type/:id')
    })
  })

  describe('With Wildcards', () => {
    const node = new Node()
    node.insert('get', '/api/*', '1st')
    node.insert('get', '/api/*', '2nd')
    node.insert('get', '/api/posts/:id', '3rd')
    node.insert('get', '/api/*', '4th')

    it('get /api/posts/123', () => {
      const res = node.search('get', '/api/posts/123')
      expect(res.length).toBe(4)
      expect(res[0].handler).toEqual('1st')
      expect(res[1].handler).toEqual('2nd')
      expect(res[2].handler).toEqual('3rd')
      expect(res[3].handler).toEqual('4th')
    })
  })

  describe('With special Wildcard', () => {
    const node = new Node()
    node.insert('get', '/posts', '/posts') // 1.1
    node.insert('get', '/posts/*', '/posts/*') // 1.2
    node.insert('get', '/posts/:id', '/posts/:id') // 2.3

    it('get /posts', () => {
      const res = node.search('get', '/posts')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('/posts')
      expect(res[1].handler).toEqual('/posts/*')
    })
  })

  describe('Complex', () => {
    const node = new Node()
    node.insert('get', '/api', 'a') // not match
    node.insert('get', '/api/*', 'b') // match
    node.insert('get', '/api/:type', 'c') // not match
    node.insert('get', '/api/:type/:id', 'd') // match
    node.insert('get', '/api/posts/:id', 'e') // match
    node.insert('get', '/api/posts/123', 'f') // match
    node.insert('get', '/*/*/:id', 'g') // match
    node.insert('get', '/api/posts/*/comment', 'h') // not match
    node.insert('get', '*', 'i') // match
    node.insert('get', '*', 'j') // match

    it('get /api/posts/123', () => {
      const res = node.search('get', '/api/posts/123')
      expect(res.length).toBe(7)
      expect(res[0].handler).toEqual('b')
      expect(res[1].handler).toEqual('d')
      expect(res[2].handler).toEqual('e')
      expect(res[3].handler).toEqual('f')
      expect(res[4].handler).toEqual('g')
      expect(res[5].handler).toEqual('i')
      expect(res[6].handler).toEqual('j')
    })
  })

  describe('Multi match', () => {
    const node = new Node()
    node.insert('get', '*', 'GET *') // 0.1
    node.insert('get', '/abc/*', 'GET /abc/*') // 1.2
    node.insert('get', '/abc/edf', 'GET /abc/edf') // 2.3
    node.insert('get', '/abc/*/ghi/jkl', 'GET /abc/*/ghi/jkl') // 4.4
    it('get /abc/edf', () => {
      const res = node.search('get', '/abc/edf')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('GET *')
      expect(res[1].handler).toEqual('GET /abc/*')
      expect(res[2].handler).toEqual('GET /abc/edf')
    })
  })

  describe('Multi match', () => {
    const node = new Node()

    node.insert('get', '/api/*', 'a') // 2.1 for /api/entry
    node.insert('get', '/api/entry', 'entry') // 2.2
    node.insert('ALL', '/api/*', 'b') // 2.3 for /api/entry

    it('get /api/entry', async () => {
      const res = node.search('get', '/api/entry')
      expect(res.length).toBe(3)
      expect(res[0].handler).toEqual('a')
      expect(res[1].handler).toEqual('entry')
      expect(res[2].handler).toEqual('b')
    })
  })

  describe('fallback', () => {
    describe('Blog - failed', () => {
      const node = new Node()
      node.insert('post', '/entry', 'post entry') // 1.1
      node.insert('post', '/entry/*', 'fallback') // 1.2
      node.insert('get', '/entry/:id', 'get entry') // 2.3
      it('post /entry', async () => {
        const res = node.search('post', '/entry')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('post entry')
        expect(res[1].handler).toEqual('fallback')
      })
    })
  })
  describe('page', () => {
    const node = new Node()
    node.insert('get', '/page', 'page') // 1.1
    node.insert('ALL', '/*', 'fallback') // 1.2
    it('get /page', async () => {
      const res = node.search('get', '/page')
      expect(res.length).toBe(2)
      expect(res[0].handler).toEqual('page')
      expect(res[1].handler).toEqual('fallback')
    })
  })
})

describe('star', () => {
  const node = new Node()
  node.insert('get', '/', '/')
  node.insert('get', '/*', '/*')
  node.insert('get', '*', '*')

  node.insert('get', '/x', '/x')
  node.insert('get', '/x/*', '/x/*')

  it('top', async () => {
    const res = node.search('get', '/')
    expect(res.length).toBe(3)
    expect(res[0].handler).toEqual('/')
    expect(res[1].handler).toEqual('/*')
    expect(res[2].handler).toEqual('*')
  })

  it('Under a certain path', async () => {
    const res = node.search('get', '/x')
    expect(res.length).toBe(4)
    expect(res[0].handler).toEqual('/*')
    expect(res[1].handler).toEqual('*')
    expect(res[2].handler).toEqual('/x')
    expect(res[3].handler).toEqual('/x/*')
  })
})

describe('Routing order With named parameters', () => {
  const node = new Node()
  node.insert('get', '/book/a', 'no-slug')
  node.insert('get', '/book/:slug', 'slug')
  node.insert('get', '/book/b', 'no-slug-b')
  it('/book/a', () => {
    const res = node.search('get', '/book/a')
    expect(res).not.toBeNull()
    expect(res.length).toBe(2)
    expect(res[0].handler).toEqual('no-slug')
    expect(res[0].params).toEqual({})
    expect(res[1].handler).toEqual('slug')
    expect(res[1].params).toEqual({ slug: 'a' })
  })
  it('/book/foo', () => {
    const res = node.search('get', '/book/foo')
    expect(res).not.toBeNull()
    expect(res.length).toBe(1)
    expect(res[0].handler).toEqual('slug')
    expect(res[0].params).toEqual({ slug: 'foo' })
    expect(res[0].params['slug']).toBe('foo')
  })
  it('/book/b', () => {
    const res = node.search('get', '/book/b')
    expect(res).not.toBeNull()
    expect(res.length).toBe(2)
    expect(res[0].handler).toEqual('slug')
    expect(res[0].params).toEqual({ slug: 'b' })
    expect(res[1].handler).toEqual('no-slug-b')
    expect(res[1].params).toEqual({})
  })
})
