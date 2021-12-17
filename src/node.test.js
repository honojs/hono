const Node = require('./node')
const node = new Node()

describe('Util Methods', () => {
  it('node.splitPath', () => {
    let ps = node.splitPath('/')
    expect(ps[0]).toBe('/')
    ps = node.splitPath('/hello')
    expect(ps[0]).toBe('/')
    expect(ps[1]).toBe('hello')
  })
})

describe('Basic Usage', () => {
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
    res = node.search('get', '/entry/456/comment')
    expect(res).toBeNull()
  })

  it('get /entry/789/comment/123', () => {
    node.insert('get', '/entry/:id/comment/:comment_id', 'get comment')
    res = node.search('get', '/entry/789/comment/123')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('get comment')
    expect(res.params['id']).toBe('789')
    expect(res.params['comment_id']).toBe('123')
  })
})

describe('Wildcard', () => {
  it('/wildcard-abc/xxxxxx/wildcard-efg', () => {
    node.insert('get', '/wildcard-abc/*/wildcard-efg', 'wildcard')
    res = node.search('get', '/wildcard-abc/xxxxxx/wildcard-efg')
    expect(res).not.toBeNull()
    expect(res.handler).toBe('wildcard')
  })
})

describe('Regexp', () => {
  node.insert(
    'get',
    '/regex-abc/:id{[0-9]+}/comment/:comment_id{[a-z]+}',
    'regexp'
  )
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
