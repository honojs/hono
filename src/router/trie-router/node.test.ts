import { Node } from '@/router/trie-router/node'

describe('Root Node', () => {
  const node = new Node()
  node.insert('get', '/', 'get root')
  it('get /', () => {
    const res = node.search('get', '/')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['get root'])
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

    expect(node.search('get', '/hello').handlers).toEqual(['get hello'])
    expect(node.search('post', '/hello').handlers).toEqual(['post hello'])
    expect(node.search('put', '/hello')).toBeNull()
  })
  it('get /nothing', () => {
    expect(node.search('get', '/nothing')).toBeNull()
  })
  it('/hello/foo, /hello/bar', () => {
    expect(node.search('get', '/hello/foo').handlers).toEqual(['get hello foo'])
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
    expect(res.handlers).toEqual(['get entry'])
    expect(res.params).not.toBeNull()
    expect(res.params['id']).toBe('123')
    expect(res.params['id']).not.toBe('1234')
  })

  it('get /entry/456/comment', () => {
    const res = node.search('get', '/entry/456/comment')
    expect(res).toBeNull()
  })

  it('get /entry/789/comment/123', () => {
    const res = node.search('get', '/entry/789/comment/123')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['get comment'])
    expect(res.params['id']).toBe('789')
    expect(res.params['comment_id']).toBe('123')
  })

  it('get /map/:location/events', () => {
    const res = node.search('get', '/map/yokohama/events')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['get events'])
    expect(res.params['location']).toBe('yokohama')
  })
})

describe('Wildcard', () => {
  const node = new Node()
  node.insert('get', '/wildcard-abc/*/wildcard-efg', 'wildcard')
  it('/wildcard-abc/xxxxxx/wildcard-efg', () => {
    const res = node.search('get', '/wildcard-abc/xxxxxx/wildcard-efg')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['wildcard'])
  })
  node.insert('get', '/wildcard-abc/*/wildcard-efg/hijk', 'wildcard')
  it('/wildcard-abc/xxxxxx/wildcard-efg/hijk', () => {
    const res = node.search('get', '/wildcard-abc/xxxxxx/wildcard-efg/hijk')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['wildcard'])
  })
})

describe('Regexp', () => {
  const node = new Node()
  node.insert('get', '/regex-abc/:id{[0-9]+}/comment/:comment_id{[a-z]+}', 'regexp')
  it('/regexp-abc/123/comment/abc', () => {
    const res = node.search('get', '/regex-abc/123/comment/abc')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['regexp'])
    expect(res.params['id']).toBe('123')
    expect(res.params['comment_id']).toBe('abc')
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
    expect(res.handlers).toEqual(['all methods'])
    res = node.search('put', '/all-methods')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['all methods'])
  })
})

describe('Special Wildcard', () => {
  const node = new Node()
  node.insert('ALL', '*', 'match all')

  it('/foo', () => {
    const res = node.search('get', '/foo')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['match all'])
  })
  it('/hello', () => {
    const res = node.search('get', '/hello')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['match all'])
  })
  it('/hello/foo', () => {
    const res = node.search('get', '/hello/foo')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['match all'])
  })
})

describe('Special Wildcard deeply', () => {
  const node = new Node()
  node.insert('ALL', '/hello/*', 'match hello')
  it('/hello', () => {
    const res = node.search('get', '/hello')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['match hello'])
  })
  it('/hello/foo', () => {
    const res = node.search('get', '/hello/foo')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['match hello'])
  })
})

describe('Default with wildcard', () => {
  const node = new Node()
  node.insert('ALL', '/api/abc', 'match api')
  node.insert('ALL', '/api/*', 'fallback')
  it('/api/abc', () => {
    const res = node.search('get', '/api/abc')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['fallback', 'match api'])
  })
  it('/api/def', () => {
    const res = node.search('get', '/api/def')
    expect(res).not.toBeNull()
    expect(res.handlers).toEqual(['fallback'])
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
      expect(res.handlers).toEqual(['GET *', 'GET /abc/*', 'GET /abc/edf'])
    })
    it('get /abc/xxx/edf', () => {
      const res = node.search('get', '/abc/xxx/edf')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['GET *', 'GET /abc/*', 'GET /abc/*/edf'])
    })
    it('get /', () => {
      const res = node.search('get', '/')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['GET *'])
    })
    it('post /', () => {
      const res = node.search('post', '/')
      expect(res).toBeNull()
    })
    it('get /abc/edf/ghi', () => {
      const res = node.search('get', '/abc/edf/ghi')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['GET *', 'GET /abc/*'])
    })
  })

  describe('Blog', () => {
    const node = new Node()
    node.insert('ALL', '*', 'middleware a')
    node.insert('get', '*', 'middleware b')
    node.insert('get', '/entry', 'get entries')
    node.insert('post', '/entry/*', 'middleware c')
    node.insert('post', '/entry', 'post entry')
    node.insert('get', '/entry/:id', 'get entry')
    node.insert('get', '/entry/:id/comment/:comment_id', 'get comment')
    it('get /entry/123', async () => {
      const res = node.search('get', '/entry/123')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['middleware b', 'middleware a', 'get entry'])
      expect(res.params['id']).toBe('123')
    })
    it('get /entry/123/comment/456', async () => {
      const res = node.search('get', '/entry/123/comment/456')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['middleware b', 'middleware a', 'get comment'])
      expect(res.params['id']).toBe('123')
      expect(res.params['comment_id']).toBe('456')
    })
    it('post /entry', async () => {
      const res = node.search('post', '/entry')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['middleware a', 'middleware c', 'post entry'])
    })
    it('delete /entry', async () => {
      const res = node.search('delete', '/entry')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['middleware a'])
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
      expect(res.handlers).toEqual(['ALL *'])
    })
    it('post /abc', () => {
      const res = node.search('post', '/abc')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['ALL *', 'ALL /abc/*'])
    })
    it('delete /abc/xxx/def', () => {
      const res = node.search('post', '/abc/xxx/def')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['ALL *', 'ALL /abc/*', 'ALL /abc/*/def'])
    })
  })

  describe('Regexp', () => {
    const node = new Node()
    node.insert('get', '/regex-abc/:id{[0-9]+}/*', 'middleware a')
    node.insert('get', '/regex-abc/:id{[0-9]+}/def', 'regexp')
    it('/regexp-abc/123/def', () => {
      const res = node.search('get', '/regex-abc/123/def')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['middleware a', 'regexp'])
      expect(res.params['id']).toBe('123')
    })
    it('/regexp-abc/123', () => {
      const res = node.search('get', '/regex-abc/123/ghi')
      expect(res).not.toBeNull()
      expect(res.handlers).toEqual(['middleware a'])
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
})
