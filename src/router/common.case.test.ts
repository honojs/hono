import type { Suite } from 'vitest'
import type { Router, Params, ParamIndexMap } from '../router'

const getSuiteHierarchy = (suite: Suite) => {
  const res: Suite[] = []
  let s: Suite | undefined = suite
  while (s) {
    res.unshift(s)
    s = s.suite
  }
  return res
}

export const runTest = ({
  skip = [],
  newRouter,
}: {
  skip?: {
    reason: string
    tests: string[]
  }[]
  newRouter: <T>() => Router<T>
}) => {
  describe('Common', () => {
    type Match = (method: string, path: string) => { handler: string; params: Params }[]
    let router: Router<string>
    let match: Match

    beforeEach(({ task, skip: skipTask }) => {
      const suites = getSuiteHierarchy(task.suite)
      const name = [...suites.slice(3).map((s) => s.name), task.name].join(' > ')
      const isSkip = skip.find((s) => s.tests.includes(name))
      if (isSkip) {
        console.log(`Skip: ${isSkip.reason}`)
        skipTask()
        return
      }

      router = newRouter()
      match = (method: string, path: string) => {
        const [matchRes, stash] = router.match(method, path)
        const res = matchRes.map((r) =>
          stash
            ? {
                handler: r[0],
                params: Object.keys(r[1]).reduce((acc, key) => {
                  acc[key] = stash[(r[1] as ParamIndexMap)[key]]
                  return acc
                }, {} as Params),
              }
            : { handler: r[0], params: r[1] as Params }
        )
        return res
      }
    })

    describe('Basic Usage', () => {
      beforeEach(() => {
        router.add('GET', '/hello', 'get hello')
        router.add('POST', '/hello', 'post hello')
        router.add('PURGE', '/hello', 'purge hello')
      })

      it('GET, post hello', async () => {
        let res = match('GET', '/hello')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('get hello')
        res = match('POST', '/hello')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('post hello')
        res = match('PURGE', '/hello')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('purge hello')
        res = match('PUT', '/hello')
        expect(res.length).toBe(0)
        res = match('GET', '/')
        expect(res.length).toBe(0)
      })
    })

    describe('Complex', () => {
      it('Named Param', async () => {
        router.add('GET', '/entry/:id', 'get entry')
        const res = match('GET', '/entry/123')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('get entry')
        expect(res[0].params['id']).toBe('123')
      })

      it('Wildcard', async () => {
        router.add('GET', '/wild/*/card', 'get wildcard')
        const res = match('GET', '/wild/xxx/card')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('get wildcard')
      })

      it('Default', async () => {
        router.add('GET', '/api/abc', 'get api')
        router.add('GET', '/api/*', 'fallback')
        let res = match('GET', '/api/abc')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('get api')
        expect(res[1].handler).toEqual('fallback')
        res = match('GET', '/api/def')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('fallback')
      })

      it('Regexp', async () => {
        router.add('GET', '/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
        let res = match('GET', '/post/20210101/hello')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('get post')
        expect(res[0].params['date']).toBe('20210101')
        expect(res[0].params['title']).toBe('hello')
        res = match('GET', '/post/onetwothree')
        expect(res.length).toBe(0)
        res = match('GET', '/post/123/123')
        expect(res.length).toBe(0)
      })

      it('/*', async () => {
        router.add('GET', '/api/*', 'auth middleware')
        router.add('GET', '/api', 'top')
        router.add('GET', '/api/posts', 'posts')
        router.add('GET', '/api/*', 'fallback')

        let res = match('GET', '/api')
        expect(res.length).toBe(3)
        expect(res[0].handler).toEqual('auth middleware')
        expect(res[1].handler).toEqual('top')
        expect(res[2].handler).toEqual('fallback')
        res = match('GET', '/api/posts')
        expect(res.length).toBe(3)
        expect(res[0].handler).toEqual('auth middleware')
        expect(res[1].handler).toEqual('posts')
        expect(res[2].handler).toEqual('fallback')
      })
    })

    describe('Registration order', () => {
      it('middleware -> handler', async () => {
        router.add('GET', '*', 'bar')
        router.add('GET', '/:type/:action', 'foo')
        const res = match('GET', '/posts/123')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('bar')
        expect(res[1].handler).toEqual('foo')
      })

      it('handler -> fallback', async () => {
        router.add('GET', '/:type/:action', 'foo')
        router.add('GET', '*', 'fallback')
        const res = match('GET', '/posts/123')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('foo')
        expect(res[1].handler).toEqual('fallback')
      })
    })

    describe('Multi match', () => {
      describe('Blog', () => {
        beforeEach(() => {
          router.add('ALL', '*', 'middleware a')
          router.add('GET', '*', 'middleware b')
          router.add('GET', '/entry', 'get entries')
          router.add('POST', '/entry/*', 'middleware c')
          router.add('POST', '/entry', 'post entry')
          router.add('GET', '/entry/:id', 'get entry')
          router.add('GET', '/entry/:id/comment/:comment_id', 'get comment')
        })

        it('GET /', async () => {
          const res = match('GET', '/')
          expect(res.length).toBe(2)
          expect(res[0].handler).toEqual('middleware a')
          expect(res[1].handler).toEqual('middleware b')
        })
        it('GET /entry/123', async () => {
          const res = match('GET', '/entry/123')
          expect(res.length).toBe(3)
          expect(res[0].handler).toEqual('middleware a')
          expect(res[0].params['id']).toBe(undefined)
          expect(res[1].handler).toEqual('middleware b')
          expect(res[1].params['id']).toBe(undefined)
          expect(res[2].handler).toEqual('get entry')
          expect(res[2].params['id']).toBe('123')
        })
        it('GET /entry/123/comment/456', async () => {
          const res = match('GET', '/entry/123/comment/456')
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
        it('POST /entry', async () => {
          const res = match('POST', '/entry')
          expect(res.length).toBe(3)
          expect(res[0].handler).toEqual('middleware a')
          expect(res[1].handler).toEqual('middleware c')
          expect(res[2].handler).toEqual('post entry')
        })
        it('DELETE /entry', async () => {
          const res = match('DELETE', '/entry')
          expect(res.length).toBe(1)
          expect(res[0].handler).toEqual('middleware a')
        })
      })

      describe('`params` per a handler', () => {
        beforeEach(() => {
          router.add('ALL', '*', 'middleware a')
          router.add('GET', '/entry/:id/*', 'middleware b')
          router.add('GET', '/entry/:id/:action', 'action')
        })

        it('GET /entry/123/show', async () => {
          const res = match('GET', '/entry/123/show')
          expect(res.length).toBe(3)
          expect(res[0].handler).toEqual('middleware a')
          expect(res[0].params['id']).toBe(undefined)
          expect(res[0].params['action']).toBe(undefined)
          expect(res[1].handler).toEqual('middleware b')
          expect(res[1].params['id']).toBe('123')
          expect(res[1].params['comment_id']).toBe(undefined)
          expect(res[2].handler).toEqual('action')
          expect(res[2].params['id']).toBe('123')
          expect(res[2].params['action']).toBe('show')
        })
      })

      it('hierarchy', () => {
        router.add('GET', '/posts/:id/comments/:comment_id', 'foo')
        router.add('GET', '/posts/:id', 'bar')
        expect(() => {
          router.match('GET', '/')
        }).not.toThrow()
      })
    })

    describe('Duplicate param name', () => {
      it('self', () => {
        router.add('GET', '/:id/:id', 'foo')
        const res = match('GET', '/123/456')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('foo')
        expect(res[0].params['id']).toBe('123')
      })

      it('parent', () => {
        router.add('GET', '/:id/:action', 'foo')
        router.add('GET', '/posts/:id', 'bar')
        const res = match('GET', '/posts/get')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('foo')
        expect(res[0].params['id']).toBe('posts')
        expect(res[0].params['action']).toBe('get')
        expect(res[1].handler).toEqual('bar')
        expect(res[1].params['id']).toBe('get')
      })

      it('child', () => {
        router.add('GET', '/posts/:id', 'foo')
        router.add('GET', '/:id/:action', 'bar')
        const res = match('GET', '/posts/get')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('foo')
        expect(res[0].params['id']).toBe('get')
        expect(res[1].handler).toEqual('bar')
        expect(res[1].params['id']).toBe('posts')
        expect(res[1].params['action']).toBe('get')
      })
    })

    describe('page', () => {
      it('GET /page', async () => {
        router.add('GET', '/page', 'page')
        router.add('ALL', '*', 'fallback') // or '*'

        const res = match('GET', '/page')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('page')
        expect(res[1].handler).toEqual('fallback')
      })
    })

    describe('star', () => {
      beforeEach(() => {
        router.add('GET', '/', '/')
        router.add('GET', '/*', '/*')
        router.add('GET', '*', '*')

        router.add('GET', '/x', '/x')
        router.add('GET', '/x/*', '/x/*')
      })

      it('top', async () => {
        const res = match('GET', '/')
        expect(res.length).toBe(3)
        expect(res[0].handler).toEqual('/')
        expect(res[1].handler).toEqual('/*')
        expect(res[2].handler).toEqual('*')
      })

      it('Under a certain path', async () => {
        const res = match('GET', '/x')
        expect(res.length).toBe(4)
        expect(res[0].handler).toEqual('/*')
        expect(res[1].handler).toEqual('*')
        expect(res[2].handler).toEqual('/x')
        expect(res[3].handler).toEqual('/x/*')
      })
    })

    describe('Optional route', () => {
      beforeEach(() => {
        router.add('GET', '/api/animals/:type?', 'animals')
        router.add('GET', '/v1/:version?/:platform?', 'result')
      })

      it('GET /api/animals/dog', async () => {
        const res = match('GET', '/api/animals/dog')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('animals')
        expect(res[0].params['type']).toBe('dog')
      })
      it('GET /api/animals', async () => {
        const res = match('GET', '/api/animals')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('animals')
        expect(res[0].params['type']).toBeUndefined()
      })
      it('GET /v1/123/abc', () => {
        const res = match('GET', '/v1/123/abc')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('result')
        expect(res[0].params['version']).toBe('123')
        expect(res[0].params['platform']).toBe('abc')
      })
      it('GET /v1/123', () => {
        const res = match('GET', '/v1/123')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('result')
        expect(res[0].params['version']).toBe('123')
        expect(res[0].params['platform']).toBeUndefined()
      })
      it('GET /v1', () => {
        const res = match('GET', '/v1')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('result')
        expect(res[0].params['version']).toBeUndefined()
        expect(res[0].params['platform']).toBeUndefined()
      })
    })

    describe('All', () => {
      beforeEach(() => {
        router.add('GET', '/hello', 'get hello')
        router.add('ALL', '/all', 'get all')
      })

      it('GET, all hello', async () => {
        const res = match('GET', '/all')
        expect(res.length).toBe(1)
      })
    })

    describe('long prefix, then star', () => {
      describe('GET only', () => {
        beforeEach(() => {
          router.add('GET', '/long/prefix/*', 'long-prefix')
          router.add('GET', '/long/*', 'long')
          router.add('GET', '*', 'star1')
          router.add('GET', '*', 'star2')
        })

        it('GET /', () => {
          const res = match('GET', '/')
          expect(res.length).toBe(2)
          expect(res[0].handler).toEqual('star1')
          expect(res[1].handler).toEqual('star2')
        })

        it('GET /long/prefix', () => {
          const res = match('GET', '/long/prefix')
          expect(res.length).toBe(4)
          expect(res[0].handler).toEqual('long-prefix')
          expect(res[1].handler).toEqual('long')
          expect(res[2].handler).toEqual('star1')
          expect(res[3].handler).toEqual('star2')
        })

        it('GET /long/prefix/test', () => {
          const res = match('GET', '/long/prefix/test')
          expect(res.length).toBe(4)
          expect(res[0].handler).toEqual('long-prefix')
          expect(res[1].handler).toEqual('long')
          expect(res[2].handler).toEqual('star1')
          expect(res[3].handler).toEqual('star2')
        })
      })

      describe('ALL and GET', () => {
        beforeEach(() => {
          router.add('ALL', '/long/prefix/*', 'long-prefix')
          router.add('ALL', '/long/*', 'long')
          router.add('GET', '*', 'star1')
          router.add('GET', '*', 'star2')
        })

        it('GET /', () => {
          const res = match('GET', '/')
          expect(res.length).toBe(2)
          expect(res[0].handler).toEqual('star1')
          expect(res[1].handler).toEqual('star2')
        })

        it('GET /long/prefix', () => {
          const res = match('GET', '/long/prefix')
          expect(res.length).toBe(4)
          expect(res[0].handler).toEqual('long-prefix')
          expect(res[1].handler).toEqual('long')
          expect(res[2].handler).toEqual('star1')
          expect(res[3].handler).toEqual('star2')
        })

        it('GET /long/prefix/test', () => {
          const res = match('GET', '/long/prefix/test')
          expect(res.length).toBe(4)
          expect(res[0].handler).toEqual('long-prefix')
          expect(res[1].handler).toEqual('long')
          expect(res[2].handler).toEqual('star1')
          expect(res[3].handler).toEqual('star2')
        })
      })
    })

    describe('Including slashes', () => {
      beforeEach(() => {
        router.add('GET', '/js/:filename{[a-z0-9/]+.js}', 'any file')
      })

      it('GET /js/main.js', () => {
        router.add('GET', '/js/main.js', 'main.js')

        const res = match('GET', '/js/main.js')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('any file')
        expect(res[0].params['filename']).toEqual('main.js')
        expect(res[1].handler).toEqual('main.js')
        expect(res[1].params['filename']).toEqual(undefined)
      })

      it('GET /js/chunk/123.js', () => {
        const res = match('GET', '/js/chunk/123.js')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('any file')
        expect(res[0].params['filename']).toEqual('chunk/123.js')
      })

      it('GET /js/chunk/nest/123.js', () => {
        const res = match('GET', '/js/chunk/nest/123.js')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('any file')
        expect(res[0].params['filename']).toEqual('chunk/nest/123.js')
      })
    })

    describe('REST API', () => {
      beforeEach(() => {
        router.add('GET', '/users/:username{[a-z]+}', 'profile')
        router.add('GET', '/users/:username{[a-z]+}/posts', 'posts')
      })

      it('GET /users/hono', () => {
        const res = match('GET', '/users/hono')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('profile')
      })

      it('GET /users/hono/posts', () => {
        const res = match('GET', '/users/hono/posts')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('posts')
      })
    })

    describe('Trailing slash', () => {
      beforeEach(() => {
        router.add('GET', '/book', 'GET /book')
        router.add('GET', '/book/:id', 'GET /book/:id')
      })

      it('GET /book', () => {
        const res = match('GET', '/book')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('GET /book')
      })
      it('GET /book/', () => {
        const res = match('GET', '/book/')
        expect(res.length).toBe(0)
      })
    })

    describe('Same path', () => {
      beforeEach(() => {
        router.add('GET', '/hey', 'Middleware A')
        router.add('GET', '/hey', 'Middleware B')
      })

      it('GET /hey', () => {
        const res = match('GET', '/hey')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('Middleware A')
        expect(res[1].handler).toEqual('Middleware B')
      })
    })

    describe('Routing with a hostname', () => {
      beforeEach(() => {
        router.add('GET', 'www1.example.com/hello', 'www1')
        router.add('GET', 'www2.example.com/hello', 'www2')
      })
      it('GET www1.example.com/hello', () => {
        const res = match('GET', 'www1.example.com/hello')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('www1')
      })
      it('GET www2.example.com/hello', () => {
        const res = match('GET', 'www2.example.com/hello')
        expect(res.length).toBe(1)
        expect(res[0].handler).toEqual('www2')
      })
      it('GET /hello', () => {
        const res = match('GET', '/hello')
        expect(res.length).toBe(0)
      })
    })

    describe('static routes of ALL and GET', () => {
      beforeEach(() => {
        router.add('ALL', '/foo', 'foo')
        router.add('GET', '/bar', 'bar')
      })

      it('get /foo', () => {
        const res = match('GET', '/foo')
        expect(res[0].handler).toEqual('foo')
      })
    })

    describe('ALL and Star', () => {
      beforeEach(() => {
        router.add('ALL', '/x', '/x')
        router.add('GET', '*', 'star')
      })

      it('Should return /x and star', async () => {
        const res = match('GET', '/x')
        expect(res.length).toBe(2)
        expect(res[0].handler).toEqual('/x')
        expect(res[1].handler).toEqual('star')
      })
    })

    describe('GET star, ALL static, GET star...', () => {
      beforeEach(() => {
        router.add('GET', '*', 'star1')
        router.add('ALL', '/x', '/x')
        router.add('GET', '*', 'star2')
        router.add('GET', '*', 'star3')
      })

      it('Should return /x and star', async () => {
        const res = match('GET', '/x')
        expect(res.length).toBe(4)
        expect(res[0].handler).toEqual('star1')
        expect(res[1].handler).toEqual('/x')
        expect(res[2].handler).toEqual('star2')
        expect(res[3].handler).toEqual('star3')
      })
    })

    // https://github.com/honojs/hono/issues/699
    describe('GET star, GET static, ALL star...', () => {
      beforeEach(() => {
        router.add('GET', '/y/*', 'star1')
        router.add('GET', '/y/a', 'a')
        router.add('ALL', '/y/b/*', 'star2')
        router.add('GET', '/y/b/bar', 'bar')
      })

      it('Should return star1, star2, and bar', async () => {
        const res = match('GET', '/y/b/bar')
        expect(res.length).toBe(3)
        expect(res[0].handler).toEqual('star1')
        expect(res[1].handler).toEqual('star2')
        expect(res[2].handler).toEqual('bar')
      })
    })

    describe('ALL star, ALL star, GET static, ALL star...', () => {
      beforeEach(() => {
        router.add('ALL', '*', 'wildcard')
        router.add('ALL', '/a/*', 'star1')
        router.add('GET', '/a/foo', 'foo')
        router.add('ALL', '/b/*', 'star2')
        router.add('GET', '/b/bar', 'bar')
      })

      it('Should return wildcard, star2 and bar', async () => {
        const res = match('GET', '/b/bar')
        expect(res.length).toBe(3)
        expect(res[0].handler).toEqual('wildcard')
        expect(res[1].handler).toEqual('star2')
        expect(res[2].handler).toEqual('bar')
      })
    })

    describe('Capture Group', () => {
      describe('Simple capturing group', () => {
        beforeEach(() => {
          router.add('get', '/foo/:capture{(?:bar|baz)}', 'ok')
        })

        it('GET /foo/bar', () => {
          const res = match('get', '/foo/bar')
          expect(res.length).toBe(1)
          expect(res[0].handler).toBe('ok')
          expect(res[0].params['capture']).toBe('bar')
        })

        it('GET /foo/baz', () => {
          const res = match('get', '/foo/baz')
          expect(res.length).toBe(1)
          expect(res[0].handler).toBe('ok')
          expect(res[0].params['capture']).toBe('baz')
        })

        it('GET /foo/qux', () => {
          const res = match('get', '/foo/qux')
          expect(res.length).toBe(0)
        })
      })

      describe('Non-capturing group', () => {
        beforeEach(() => {
          router.add('get', '/foo/:capture{(?:bar|baz)}', 'ok')
        })

        it('GET /foo/bar', () => {
          const res = match('get', '/foo/bar')
          expect(res.length).toBe(1)
          expect(res[0].handler).toBe('ok')
          expect(res[0].params['capture']).toBe('bar')
        })

        it('GET /foo/baz', () => {
          const res = match('get', '/foo/baz')
          expect(res.length).toBe(1)
          expect(res[0].handler).toBe('ok')
          expect(res[0].params['capture']).toBe('baz')
        })

        it('GET /foo/qux', () => {
          const res = match('get', '/foo/qux')
          expect(res.length).toBe(0)
        })
      })

      describe('Non-capturing group with prefix', () => {
        beforeEach(() => {
          router.add('get', '/foo/:capture{ba(?:r|z)}', 'ok')
        })

        it('GET /foo/bar', () => {
          const res = match('get', '/foo/bar')
          expect(res.length).toBe(1)
          expect(res[0].handler).toBe('ok')
          expect(res[0].params['capture']).toBe('bar')
        })

        it('GET /foo/baz', () => {
          const res = match('get', '/foo/baz')
          expect(res.length).toBe(1)
          expect(res[0].handler).toBe('ok')
          expect(res[0].params['capture']).toBe('baz')
        })

        it('GET /foo/qux', () => {
          const res = match('get', '/foo/qux')
          expect(res.length).toBe(0)
        })
      })

      describe('Complex capturing group', () => {
        it('GET request', () => {
          router.add('get', '/foo/:capture{ba(r|z)}', 'ok')

          const res = match('get', '/foo/bar')
          expect(res.length).toBe(1)
          expect(res[0].handler).toBe('ok')
        })
      })
    })

    describe('Unknown method', () => {
      beforeEach(() => {
        router.add('GET', '/', 'index')
        router.add('ALL', '/all', 'all')
      })

      it('UNKNOWN_METHOD /', () => {
        const res = match('UNKNOWN_METHOD', '/')
        expect(res.length).toBe(0)
      })

      it('UNKNOWN_METHOD /all', () => {
        const res = match('UNKNOWN_METHOD', '/all')
        expect(res.length).toBe(1)
        expect(res[0].handler).toBe('all')
      })
    })
  })
}
