import { UnsupportedPathError } from '../../router'
import { runTest } from '../common.case.test'
import { LinearRouter } from './router'

describe('LinearRouter', () => {
  runTest({
    skip: [
      {
        reason: 'UnsupportedPath',
        tests: [
          'Multi match > `params` per a handler > GET /entry/123/show',
          'Capture regex pattern has trailing wildcard > GET /foo/bar/file.html',
          'Complex > Parameter with {.*} regexp',
        ],
      },
      {
        reason: 'LinearRouter allows trailing slashes',
        tests: ['Trailing slash > GET /book/'],
      },
    ],
    newRouter: () => new LinearRouter(),
  })

  describe('Multi match', () => {
    describe('`params` per a handler', () => {
      const router = new LinearRouter<string>()

      beforeEach(() => {
        router.add('ALL', '*', 'middleware a')
        router.add('GET', '/entry/:id/*', 'middleware b')
        router.add('GET', '/entry/:id/:action', 'action')
      })

      it('GET /entry/123/show', () => {
        expect(() => {
          router.match('GET', '/entry/123/show')
        }).toThrowError(UnsupportedPathError)
      })
    })
  })

  describe('Trailing slash', () => {
    const router = new LinearRouter<string>()

    beforeEach(() => {
      router.add('GET', '/book', 'GET /book')
      router.add('GET', '/book/:id', 'GET /book/:id')
    })

    it('GET /book/', () => {
      const [res] = router.match('GET', '/book/')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('GET /book')
    })
  })

  describe('Skip part', () => {
    const router = new LinearRouter<string>()

    beforeEach(() => {
      router.add('GET', '/products/:id{d+}', 'GET /products/:id{d+}')
    })

    it('GET /products/list', () => {
      const [res] = router.match('GET', '/products/list')
      expect(res.length).toBe(0)
    })
  })

  describe('Static vs parameterized', () => {
    const router = new LinearRouter<string>()

    router.add('GET', '/book/:slug', 'GET /book/:slug')
    router.add('GET', '/boo/:slug', 'GET /boo/:slug')
    router.add('GET', '/bo/:slug', 'GET /bo/:slug')
    router.add('GET', '/book-now', 'GET /book-now')
    router.add('GET', '/api/:version', 'GET /api/:version')
    router.add('GET', '/api-v1', 'GET /api-v1')
    router.add('GET', '/user/:id/posts/:postId', 'GET /user/:id/posts/:postId')
    router.add('GET', '/user/admin/posts-all', 'GET /user/admin/posts-all')
    router.add('GET', '/resources/:type/:id', 'GET /resources/:type/:id')
    router.add('GET', '/resources-list/users-active', 'GET /resources-list/users-active')

    it('GET /book-now', () => {
      const [res] = router.match('GET', '/book-now')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('GET /book-now')
    })

    it('GET /api-v1', () => {
      const [res] = router.match('GET', '/api-v1')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('GET /api-v1')
    })

    it('GET /user/admin/posts-all', () => {
      const [res] = router.match('GET', '/user/admin/posts-all')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('GET /user/admin/posts-all')
    })

    it('GET /resources-list/users-active', () => {
      const [res] = router.match('GET', '/resources-list/users-active')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('GET /resources-list/users-active')
    })
  })
})
