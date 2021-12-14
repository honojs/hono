const Router = require('./router')

let router = new Router()

describe('root match', () => {
  it('/ match', () => {
    router.add('/', 'root')
    let match = router.match('/')
    expect(match).not.toBeNull()
    expect(match[0]).toBe('root')
    match = router.match('/foo')
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

describe('path match', () => {
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

describe('wildcard', () => {
  it('match', () => {
    router = new Router()
    router.add('/abc/*/def')
    let match = router.match('/abc/xxx/def')
    expect(match).not.toBeNull()
    match = router.match('/abc/xxx/abc')
    expect(match).toBeNull()
  })
})
