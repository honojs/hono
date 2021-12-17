const Node = require('./node')

describe('Basic Usage', () => {
  const node = new Node()
  node.insert('get', '/', 'get root')
  it('get /', () => {
    expect(node.search('get', '/')).not.toBeNull()
  })
})

describe('Basic Usage', () => {
  const node = new Node()
  node.insert('get', '/hello', 'get hello')
  it('get /', () => {
    expect(node.search('get', '/')).toBeNull()
  })
})
