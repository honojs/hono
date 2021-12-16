const Router = require('./router')

describe('root match', () => {
  let router = Router()
  let route = router.get('/', 'get handler')
  route = router.post('/', 'post handler')

  let match = router.match('get', '/')
  expect(match[0]).toBe('get handler')
  match = router.match('post', '/')
  expect(match[0]).toBe('post handler')
})

describe.skip('all', () => {
  let router = Router()
  router.all('/hello', 'all hello')

  let match = router.match('get', '/hello')
  expect(match[0]).toBe('all hello')
  match = router.match('post', '/hello')
  expect(match[0]).toBe('all hello')
})

describe.skip('', () => {
  let router = Router()
  it('/ match', () => {
    router.add('get', '/', 'root')
    let match = router.match('get', '/')
    expect(match).not.toBeNull()
    expect(match[0]).toBe('root')
    match = router.match('get', '/foo')
    expect(match).toBeNull()
  })

  it('/hello match', () => {
    router.add('/hello', 'hello')
    match = router.match('/foo')
    expect(match).toBeNull()
    match = router.match('/hello')
    expect(match[0]).toBe('hello')
  })
})


describe.skip('path match', () => {
  let router = Router()
  router.add('/entry/:id', 'entry-id')
  router.add('/entry/:id/:comment', 'entry-id-comment')
  router.add('/year/:year{[0-9]{4}}/:month{[0-9]{2}}', 'date-regex')

  it('entry id match', () => {
    const match = router.match('/entry/123')
    expect(match[0]).toBe('entry-id')
    expect(match[1]['id']).toBe('123')
  })

  it('entry id and comment match', () => {
    const match = router.match('/entry/123/45678')
    expect(match[0]).toBe('entry-id-comment')
    expect(match[1]['id']).toBe('123')
    expect(match[1]['comment']).toBe('45678')
  })

  it('date-regex', () => {
    const match = router.match('/year/2021/12')
    expect(match[0]).toBe('date-regex')
    expect(match[1]['year']).toBe('2021')
    expect(match[1]['month']).toBe('12')
  })

  it('not match', () => {
    let match = router.match('/foo')
    expect(match).toBeNull()
    match = router.match('/year/abc')
    expect(match).toBeNull()
  })
})

describe.skip('wildcard', () => {
  let router = Router()
  it('match', () => {
    router = Router()
    router.add('/abc/*/def')
    let match = router.match('/abc/xxx/def')
    expect(match).not.toBeNull()
    match = router.match('/abc/xxx/abc')
    expect(match).toBeNull()
  })
})
