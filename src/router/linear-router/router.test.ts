import { LinearRouter } from './router'

describe('Basic Usage', () => {
  const router = new LinearRouter<string>()

  router.add('GET', '/hello', 'get hello')
  router.add('POST', '/hello', 'post hello')
  router.add('PURGE', '/hello', 'purge hello')

  it('get, post hello', async () => {
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
  let router: LinearRouter<string>
  beforeEach(() => {
    router = new LinearRouter<string>()
  })

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
    router.add('GET', '/api/abc', 'get api')
    router.add('GET', '/api/*', 'fallback')
    let res = router.match('GET', '/api/abc')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get api', 'fallback'])
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

  it('/*', async () => {
    router.add('GET', '/api/*', 'auth middleware')
    router.add('GET', '/api', 'top')
    router.add('GET', '/api/posts', 'posts')
    router.add('GET', '/api/*', 'fallback')

    let res = router.match('GET', '/api')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['auth middleware', 'top', 'fallback'])

    res = router.match('GET', '/api/posts')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['auth middleware', 'posts', 'fallback'])
  })
})
