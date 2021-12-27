const Node = require('./node')

describe('Root Node', () => {
  const node = new Node()
  node.insert('get', '/', 'get root')
  it('get /', () => {
    let res = node.search('get', '/')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get root')
    expect(node.search('get', '/hello')).toBeNull()
  })
})

describe('Root Node id not defined', () => {
  const node = new Node()
  node.insert('get', '/hello', 'get hello')
  it('get /', () => {
    expect(node.search('get', '/')).toBeNull()
  })
})

describe('All with *', () => {
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

    expect(node.search('get', '/hello').handler).toBe('get hello')
    expect(node.search('post', '/hello').handler).toBe('post hello')
    expect(node.search('put', '/hello')).toBeNull()
  })
  it('get /nothing', () => {
    expect(node.search('get', '/nothing')).toBeNull()
  })
  it('/hello/foo, /hello/bar', () => {
    expect(node.search('get', '/hello/foo').handler).toBe('get hello foo')
    expect(node.search('post', '/hello/foo')).toBeNull()
    expect(node.search('get', '/hello/bar')).toBeNull()
  })
  it('/hello/foo/bar', () => {
    expect(node.search('get', '/hello/foo/bar')).toBeNull()
  })
})

describe('Name path', () => {
  const node = new Node()
  it('get /entry/123', () => {
    node.insert('get', '/entry/:id', 'get entry')
    let res = node.search('get', '/entry/123')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get entry')
    expect(res.params).not.toBeNull()
    expect(res.params['id']).toBe('123')
    expect(res.params['id']).not.toBe('1234')
  })

  it('get /entry/456/comment', () => {
    node.insert('get', '/entry/:id', 'get entry')
    let res = node.search('get', '/entry/456/comment')
    expect(res).toBeNull()
  })

  it('get /entry/789/comment/123', () => {
    node.insert('get', '/entry/:id/comment/:comment_id', 'get comment')
    let res = node.search('get', '/entry/789/comment/123')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get comment')
    expect(res.params['id']).toBe('789')
    expect(res.params['comment_id']).toBe('123')
  })

  it('get /map/:location/events', () => {
    node.insert('get', '/map/:location/events', 'get events')
    let res = node.search('get', '/map/yokohama/events')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get events')
    expect(res.params['location']).toBe('yokohama')
  })
})

describe('Wildcard', () => {
  const node = new Node()
  it('/wildcard-abc/xxxxxx/wildcard-efg', () => {
    node.insert('get', '/wildcard-abc/*/wildcard-efg', 'wildcard')
    let res = node.search('get', '/wildcard-abc/xxxxxx/wildcard-efg')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('wildcard')
  })
})

describe('Regexp', () => {
  const node = new Node()
  node.insert('get', '/regex-abc/:id{[0-9]+}/comment/:comment_id{[a-z]+}', 'regexp')
  it('/regexp-abc/123/comment/abc', () => {
    res = node.search('get', '/regex-abc/123/comment/abc')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('regexp')
    expect(res.params['id']).toBe('123')
    expect(res.params['comment_id']).toBe('abc')
  })
  it('/regexp-abc/abc', () => {
    res = node.search('get', '/regex-abc/abc')
    expect(res).toBeNull()
  })
  it('/regexp-abc/123/comment/123', () => {
    res = node.search('get', '/regex-abc/123/comment/123')
    expect(res).toBeNull()
  })
})

describe('All', () => {
  const node = new Node()
  node.insert('all', '/all-methods', 'all methods')
  it('/all-methods', () => {
    res = node.search('get', '/all-methods')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('all methods')
    res = node.search('put', '/all-methods')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('all methods')
  })
})
