import { UnsupportedPathError } from '../../router'
import { RegExpLiteRouter } from './router'

describe('Basic Usage', () => {
  const router = new RegExpLiteRouter<string>()

  router.add('GET', '/hello', 'get hello')
  router.add('POST', '/hello', 'post hello')

  it('get, post hello', async () => {
    let res = router.match('GET', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get hello'])

    res = router.match('POST', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['post hello'])

    res = router.match('PUT', '/hello')
    expect(res).toBeNull()

    res = router.match('GET', '/')
    expect(res).toBeNull()
  })
})

describe('Complex', () => {
  let router: RegExpLiteRouter<string>
  beforeEach(() => {
    router = new RegExpLiteRouter<string>()
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

describe('Registration order', () => {
  let router: RegExpLiteRouter<string>
  beforeEach(() => {
    router = new RegExpLiteRouter<string>()
  })

  it('middleware -> handler', async () => {
    router.add('GET', '*', 'bar')
    router.add('GET', '/:type/:action', 'foo')
    const res = router.match('GET', '/posts/123')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['bar', 'foo'])
  })

  it('handler -> fallback', async () => {
    router.add('GET', '/:type/:action', 'foo')
    router.add('GET', '*', 'fallback')
    const res = router.match('GET', '/posts/123')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['foo', 'fallback'])
  })
})

describe('Multi match', () => {
  describe('Blog', () => {
    const router = new RegExpLiteRouter<string>()

    router.add('ALL', '*', 'middleware a')
    router.add('GET', '*', 'middleware b')
    router.add('GET', '/entry', 'get entries')
    router.add('POST', '/entry/*', 'middleware c')
    router.add('POST', '/entry', 'post entry')
    router.add('GET', '/entry/:id', 'get entry')
    router.add('GET', '/entry/:id/comment/:comment_id', 'get comment')
    it('GET /', async () => {
      const res = router.match('GET', '/')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b'])
    })
    it('GET /entry/123', async () => {
      const res = router.match('GET', '/entry/123')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b', 'get entry'])
      expect(res?.params['id']).toBe('123')
    })
    it('GET /entry/123/comment/456', async () => {
      const res = router.match('GET', '/entry/123/comment/456')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b', 'get comment'])
      expect(res?.params['id']).toBe('123')
      expect(res?.params['comment_id']).toBe('456')
    })
    it('POST /entry', async () => {
      const res = router.match('POST', '/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware c', 'post entry'])
    })
    it('DELETE /entry', async () => {
      const res = router.match('DELETE', '/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a'])
    })
  })

  it('hierarchy', () => {
    const router = new RegExpLiteRouter<string>()
    router.add('GET', '/posts/:id/comments/:comment_id', 'foo')
    router.add('GET', '/posts/:id', 'bar')
    expect(() => {
      router.match('GET', '/')
    }).not.toThrow()
  })
})

describe('Check for duplicate parameter names', () => {
  it('self', () => {
    const router = new RegExpLiteRouter<string>()
    router.add('GET', '/:id/:id', 'get')
    expect(() => {
      router.match('GET', '/') // check parameter names on the first `match` call
    }).toThrowError(/Duplicate param name/)
  })
})

describe('UnsupportedPathError', () => {
  describe('Ambiguous', () => {
    const router = new RegExpLiteRouter<string>()

    router.add('GET', '/:user/entries', 'get user entries')
    router.add('GET', '/entry/:name', 'get entry')
    router.add('POST', '/entry', 'create entry')

    it('GET /entry/entry', async () => {
      expect(() => {
        router.match('GET', '/entry/entries')
      }).toThrowError(UnsupportedPathError)
    })
  })

  describe('Multiple handlers with different label', () => {
    const router = new RegExpLiteRouter<string>()

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
    const router = new RegExpLiteRouter<string>()
    router.add('GET', '/:id/:action', 'foo')
    router.add('GET', '/posts/:id', 'bar')
    expect(() => {
      router.match('GET', '/')
    }).toThrowError(UnsupportedPathError)
  })

  it('child', () => {
    const router = new RegExpLiteRouter<string>()
    router.add('GET', '/posts/:id', 'foo')
    router.add('GET', '/:id/:action', 'bar')

    expect(() => {
      router.match('GET', '/')
    }).toThrowError(UnsupportedPathError)
  })

  it('different regular expression', () => {
    const router = new RegExpLiteRouter<string>()
    router.add('GET', '/:id/:action{create|update}', 'foo')
    router.add('GET', '/:id/:action{delete}', 'bar')
    expect(() => {
      router.match('GET', '/')
    }).toThrowError(UnsupportedPathError)
  })
})

describe('star', () => {
  const router = new RegExpLiteRouter<string>()

  router.add('GET', '/', '/')
  router.add('GET', '/*', '/*')
  router.add('GET', '*', '*')

  router.add('GET', '/x', '/x')
  router.add('GET', '/x/*', '/x/*')

  it('top', async () => {
    const res = router.match('GET', '/')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['/', '/*', '*'])
  })

  it('Under a certain path', async () => {
    const res = router.match('GET', '/x')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['/*', '*', '/x', '/x/*'])
  })
})
