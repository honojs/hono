import { Node } from './node'

describe('Root Node', () => {
  const node = new Node()
  node.insert('get', '/', 'get root')
  it('get /', () => {
    const res = node.search('get', '/')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get root'])
    expect(node.search('get', '/hello')).toBeNull()
  })
})

describe('Root Node is not defined', () => {
  const node = new Node()
  node.insert('get', '/hello', 'get hello')
  it('get /', () => {
    expect(node.search('get', '/')).toBeNull()
  })
})

describe('Get with *', () => {
  const node = new Node()
  node.insert('get', '*', 'get all')
  it('get /', () => {
    expect(node.search('get', '/')).not.toBeNull()
    expect(node.search('get', '/hello')).not.toBeNull()
  })
})

describe('Basic Usage', () => {
  const node = new Node()
  node.insert('get', '/hello', 'get hello')
  node.insert('post', '/hello', 'post hello')
  node.insert('get', '/hello/foo', 'get hello foo')

  it('get, post /hello', () => {
    expect(node.search('get', '/')).toBeNull()
    expect(node.search('post', '/')).toBeNull()

    expect(node.search('get', '/hello')?.handlers).toEqual(['get hello'])
    expect(node.search('post', '/hello')?.handlers).toEqual(['post hello'])
    expect(node.search('put', '/hello')).toBeNull()
  })
  it('get /nothing', () => {
    expect(node.search('get', '/nothing')).toBeNull()
  })
  it('/hello/foo, /hello/bar', () => {
    expect(node.search('get', '/hello/foo')?.handlers).toEqual(['get hello foo'])
    expect(node.search('post', '/hello/foo')).toBeNull()
    expect(node.search('get', '/hello/bar')).toBeNull()
  })
  it('/hello/foo/bar', () => {
    expect(node.search('get', '/hello/foo/bar')).toBeNull()
  })
})

describe('Name path', () => {
  const node = new Node()
  node.insert('get', '/entry/:id', 'get entry')
  node.insert('get', '/entry/:id/comment/:comment_id', 'get comment')
  node.insert('get', '/map/:location/events', 'get events')

  it('get /entry/123', () => {
    const res = node.search('get', '/entry/123')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get entry'])
    expect(res?.params).not.toBeNull()
    expect(res?.params['id']).toBe('123')
    expect(res?.params['id']).not.toBe('1234')
  })

  it('get /entry/456/comment', () => {
    const res = node.search('get', '/entry/456/comment')
    expect(res).toBeNull()
  })

  it('get /entry/789/comment/123', () => {
    const res = node.search('get', '/entry/789/comment/123')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get comment'])
    expect(res?.params['id']).toBe('789')
    expect(res?.params['comment_id']).toBe('123')
  })

  it('get /map/:location/events', () => {
    const res = node.search('get', '/map/yokohama/events')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get events'])
    expect(res?.params['location']).toBe('yokohama')
  })
})

describe('Name path - Multiple route', () => {
  const node = new Node()

  node.insert('get', '/:type/:id', 'common')
  node.insert('get', '/posts/:id', 'specialized')

  it('get /posts/123', () => {
    const res = node.search('get', '/posts/123')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['common', 'specialized'])
    expect(res?.params['id']).toBe('123')
  })
})

describe('Param prefix', () => {
  const node = new Node()

  node.insert('get', '/:foo', 'onepart')
  node.insert('get', '/:bar/:baz', 'twopart')

  it('get /hello', () => {
    const res = node.search('get', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['onepart'])
    expect(res?.params['foo']).toBe('hello')
  })

  it('get /hello/world', () => {
    const res = node.search('get', '/hello/world')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['twopart'])
    expect(res?.params['bar']).toBe('hello')
    expect(res?.params['baz']).toBe('world')
  })
})

describe('Wildcard', () => {
  const node = new Node()
  node.insert('get', '/wildcard-abc/*/wildcard-efg', 'wildcard')
  it('/wildcard-abc/xxxxxx/wildcard-efg', () => {
    const res = node.search('get', '/wildcard-abc/xxxxxx/wildcard-efg')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['wildcard'])
  })
  node.insert('get', '/wildcard-abc/*/wildcard-efg/hijk', 'wildcard')
  it('/wildcard-abc/xxxxxx/wildcard-efg/hijk', () => {
    const res = node.search('get', '/wildcard-abc/xxxxxx/wildcard-efg/hijk')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['wildcard'])
  })
})

describe('Regexp', () => {
  const node = new Node()
  node.insert('get', '/regex-abc/:id{[0-9]+}/comment/:comment_id{[a-z]+}', 'regexp')
  it('/regexp-abc/123/comment/abc', () => {
    const res = node.search('get', '/regex-abc/123/comment/abc')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['regexp'])
    expect(res?.params['id']).toBe('123')
    expect(res?.params['comment_id']).toBe('abc')
  })
  it('/regexp-abc/abc', () => {
    const res = node.search('get', '/regex-abc/abc')
    expect(res).toBeNull()
  })
  it('/regexp-abc/123/comment/123', () => {
    const res = node.search('get', '/regex-abc/123/comment/123')
    expect(res).toBeNull()
  })
})

describe('All', () => {
  const node = new Node()
  node.insert('ALL', '/all-methods', 'all methods') // ALL
  it('/all-methods', () => {
    let res = node.search('get', '/all-methods')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['all methods'])
    res = node.search('put', '/all-methods')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['all methods'])
  })
})

describe('Special Wildcard', () => {
  const node = new Node()
  node.insert('ALL', '*', 'match all')

  it('/foo', () => {
    const res = node.search('get', '/foo')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['match all'])
  })
  it('/hello', () => {
    const res = node.search('get', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['match all'])
  })
  it('/hello/foo', () => {
    const res = node.search('get', '/hello/foo')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['match all'])
  })
})

describe('Special Wildcard deeply', () => {
  const node = new Node()
  node.insert('ALL', '/hello/*', 'match hello')
  it('/hello', () => {
    const res = node.search('get', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['match hello'])
  })
  it('/hello/foo', () => {
    const res = node.search('get', '/hello/foo')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['match hello'])
  })
})

describe('Default with wildcard', () => {
  const node = new Node()
  node.insert('ALL', '/api/*', 'fallback')
  node.insert('ALL', '/api/abc', 'match api')
  it('/api/abc', () => {
    const res = node.search('get', '/api/abc')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['fallback', 'match api'])
  })
  it('/api/def', () => {
    const res = node.search('get', '/api/def')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['fallback'])
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
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['GET *', 'GET /abc/*', 'GET /abc/edf'])
    })
    it('get /abc/xxx/edf', () => {
      const res = node.search('get', '/abc/xxx/edf')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['GET *', 'GET /abc/*', 'GET /abc/*/edf'])
    })
    it('get /', () => {
      const res = node.search('get', '/')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['GET *'])
    })
    it('post /', () => {
      const res = node.search('post', '/')
      expect(res).toBeNull()
    })
    it('get /abc/edf/ghi', () => {
      const res = node.search('get', '/abc/edf/ghi')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['GET *', 'GET /abc/*'])
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
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b', 'get entry'])
      expect(res?.params['id']).toBe('123')
    })
    it('get /entry/123/comment/456', async () => {
      const res = node.search('get', '/entry/123/comment/456')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b', 'get comment'])
      expect(res?.params['id']).toBe('123')
      expect(res?.params['comment_id']).toBe('456')
    })
    it('post /entry', async () => {
      const res = node.search('post', '/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware b', 'middleware c', 'post entry'])
    })
    it('delete /entry', async () => {
      const res = node.search('delete', '/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware b'])
    })
  })

  describe('ALL', () => {
    const node = new Node()
    node.insert('ALL', '*', 'ALL *')
    node.insert('ALL', '/abc/*', 'ALL /abc/*')
    node.insert('ALL', '/abc/*/def', 'ALL /abc/*/def')
    it('get /', () => {
      const res = node.search('get', '/')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['ALL *'])
    })
    it('post /abc', () => {
      const res = node.search('post', '/abc')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['ALL *', 'ALL /abc/*'])
    })
    it('delete /abc/xxx/def', () => {
      const res = node.search('post', '/abc/xxx/def')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['ALL *', 'ALL /abc/*', 'ALL /abc/*/def'])
    })
  })

  describe('Regexp', () => {
    const node = new Node()
    node.insert('get', '/regex-abc/:id{[0-9]+}/*', 'middleware a')
    node.insert('get', '/regex-abc/:id{[0-9]+}/def', 'regexp')
    it('/regexp-abc/123/def', () => {
      const res = node.search('get', '/regex-abc/123/def')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'regexp'])
      expect(res?.params['id']).toBe('123')
    })
    it('/regexp-abc/123', () => {
      const res = node.search('get', '/regex-abc/123/ghi')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a'])
    })
  })

  describe('Trailing slash', () => {
    const node = new Node()
    node.insert('get', '/book', 'GET /book')
    node.insert('get', '/book/:id', 'GET /book/:id')
    it('get /book', () => {
      const res = node.search('get', '/book')
      expect(res).not.toBeNull()
    })
    it('get /book/', () => {
      const res = node.search('get', '/book/')
      expect(res).toBeNull()
    })
  })

  describe('Same path', () => {
    const node = new Node()
    node.insert('get', '/hey', 'Middleware A')
    node.insert('get', '/hey', 'Middleware B')
    it('get /hey', () => {
      const res = node.search('get', '/hey')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['Middleware A', 'Middleware B'])
    })
  })

  describe('Including slashes', () => {
    const node = new Node()
    node.insert('get', '/js/:filename{[a-z0-9/]+.js}', 'any file')
    node.insert('get', '/js/main.js', 'main.js')

    it('get /js/main.js', () => {
      const res = node.search('get', '/js/main.js')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['any file', 'main.js'])
      expect(res?.params).toEqual({ filename: 'main.js' })
    })

    it('get /js/chunk/123.js', () => {
      const res = node.search('get', '/js/chunk/123.js')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['any file'])
      expect(res?.params).toEqual({ filename: 'chunk/123.js' })
    })

    it('get /js/chunk/nest/123.js', () => {
      const res = node.search('get', '/js/chunk/nest/123.js')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['any file'])
      expect(res?.params).toEqual({ filename: 'chunk/nest/123.js' })
    })
  })

  describe('REST API', () => {
    const node = new Node()
    node.insert('get', '/users/:username{[a-z]+}', 'profile')
    node.insert('get', '/users/:username{[a-z]+}/posts', 'posts')

    it('get /users/hono', () => {
      const res = node.search('get', '/users/hono')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['profile'])
    })

    it('get /users/hono/posts', () => {
      const res = node.search('get', '/users/hono/posts')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['posts'])
    })
  })
})

describe('Duplicate param name', () => {
  it('self', () => {
    const node = new Node()
    expect(() => {
      node.insert('get', '/:id/:id', 'foo')
    }).toThrowError(/Duplicate param name/)
  })

  it('parent', () => {
    const node = new Node()
    node.insert('get', '/:id/:action', 'foo')
    expect(() => {
      node.insert('get', '/posts/:id', 'bar')
    }).toThrowError(/Duplicate param name/)
  })

  it('child', () => {
    const node = new Node()
    node.insert('get', '/posts/:id', 'foo')
    expect(() => {
      node.insert('get', '/:id/:action', 'bar')
    }).toThrowError(/Duplicate param name/)
  })

  it('hierarchy', () => {
    const node = new Node()
    node.insert('get', '/posts/:id/comments/:comment_id', 'foo')
    expect(() => {
      node.insert('get', '/posts/:id', 'bar')
    }).not.toThrowError()
  })

  it('regular expression', () => {
    const node = new Node()
    node.insert('get', '/:id/:action{create|update}', 'foo')
    expect(() => {
      node.insert('get', '/:id/:action{delete}', 'bar')
    }).not.toThrowError()
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
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['a', '/page', '/:slug'])
    })
  })

  describe('With Named path', () => {
    const node = new Node()
    node.insert('get', '*', 'a')
    node.insert('get', '/posts/:id', '/posts/:id')
    node.insert('get', '/:type/:id', '/:type/:id')

    it('get /posts/123', () => {
      const res = node.search('get', '/posts/123')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['a', '/posts/:id', '/:type/:id'])
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
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['1st', '2nd', '3rd', '4th'])
    })
  })

  describe('With special Wildcard', () => {
    const node = new Node()
    node.insert('get', '/posts', '/posts') // 1.1
    node.insert('get', '/posts/*', '/posts/*') // 1.2
    node.insert('get', '/posts/:id', '/posts/:id') // 2.3

    it('get /posts', () => {
      const res = node.search('get', '/posts')

      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['/posts', '/posts/*'])
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
      expect(res?.handlers).toEqual(['b', 'd', 'e', 'f', 'g', 'i', 'j'])
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
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['GET *', 'GET /abc/*', 'GET /abc/edf'])
    })
  })

  describe('Multi match', () => {
    const node = new Node()

    node.insert('get', '/api/*', 'a') // 2.1 for /api/entry
    node.insert('get', '/api/entry', 'entry') // 2.2
    node.insert('ALL', '/api/*', 'b') // 2.3 for /api/entry

    it('get /api/entry', async () => {
      const res = node.search('get', '/api/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['a', 'entry', 'b'])
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
        expect(res).not.toBeNull()
        expect(res?.handlers).toEqual(['post entry', 'fallback'])
      })
    })
  })
  describe('page', () => {
    const node = new Node()
    node.insert('get', '/page', 'page') // 1.1
    node.insert('ALL', '/*', 'fallback') // 1.2
    it('get /page', async () => {
      const res = node.search('get', '/page')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['page', 'fallback'])
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
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['/', '/*', '*']) // =>  failed ['*', '/*', '/']
  })

  it('Under a certain path', async () => {
    const res = node.search('get', '/x')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['/*', '*', '/x', '/x/*'])
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
    expect(res?.handlers).toEqual(['no-slug', 'slug'])
    expect(res?.params['slug']).toBe('a')
  })
  it('/book/foo', () => {
    const res = node.search('get', '/book/foo')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['slug'])
    expect(res?.params['slug']).toBe('foo')
  })
  it('/book/b', () => {
    const res = node.search('get', '/book/b')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['slug', 'no-slug-b'])
    expect(res?.params['slug']).toBe('b')
  })
})
