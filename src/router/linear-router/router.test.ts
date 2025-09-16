import { UnsupportedPathError } from '../../router';
import { runTest } from '../common.case.test';
import { LinearRouter } from './router';

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

  describe('Static matchRoute method', () => {
    describe('Exact path matching', () => {
      it('should match exact paths', () => {
        const result = LinearRouter.matchRoute('/users', '/users')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({})
        expect(result!.paramIndexMap).toEqual({})
        expect(result!.paramStash).toEqual([])
      })

      it('should match exact paths with trailing slash', () => {
        const result = LinearRouter.matchRoute('/users/', '/users')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({})
      })

      it('should not match different paths', () => {
        const result = LinearRouter.matchRoute('/users', '/books')
        expect(result).toBeNull()
      })
    })

    describe('Wildcard matching', () => {
      it('should match single wildcard', () => {
        const result = LinearRouter.matchRoute('/anything', '*')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({})
      })

      it('should match wildcard with slash', () => {
        const result = LinearRouter.matchRoute('/anything/else', '/*')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({})
      })

      it('should match wildcard patterns without labels', () => {
        const result = LinearRouter.matchRoute('/api/v1/users', '/api/*/users')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({})
      })

      it('should not match incomplete wildcard patterns', () => {
        const result = LinearRouter.matchRoute('/api/users', '/api/*/v1/users')
        expect(result).toBeNull()
      })
    })

    describe('Parameter matching', () => {
      it('should match single parameter', () => {
        const result = LinearRouter.matchRoute('/users/123', '/users/:id')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({ id: '123' })
        expect(result!.paramIndexMap).toEqual({ id: 0 })
        expect(result!.paramStash).toEqual(['123'])
      })

      it('should match multiple parameters', () => {
        const result = LinearRouter.matchRoute('/users/123/posts/456', '/users/:userId/posts/:postId')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({ userId: '123', postId: '456' })
        expect(result!.paramIndexMap).toEqual({ userId: 0, postId: 1 })
        expect(result!.paramStash).toEqual(['123', '456'])
      })

      it('should match parameter at end of path', () => {
        const result = LinearRouter.matchRoute('/users/john', '/users/:name')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({ name: 'john' })
      })

      it('should not match when parameter is missing', () => {
        const result = LinearRouter.matchRoute('/users/', '/users/:id')
        expect(result).toBeNull()
      })

      it('should not match when path has extra segments', () => {
        const result = LinearRouter.matchRoute('/users/123/extra', '/users/:id')
        expect(result).toBeNull()
      })
    })

    describe('Pattern matching with regex', () => {
      it('should match parameter with digit pattern', () => {
        const result = LinearRouter.matchRoute('/products/123', '/products/:id{\\d+}')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({ id: '123' })
        expect(result!.paramIndexMap).toEqual({ id: 0 })
        expect(result!.paramStash).toEqual(['123'])
      })

      it('should not match parameter with wrong pattern', () => {
        const result = LinearRouter.matchRoute('/products/abc', '/products/:id{\\d+}')
        expect(result).toBeNull()
      })

      it('should match parameter with word pattern', () => {
        const result = LinearRouter.matchRoute('/categories/electronics', '/categories/:name{\\w+}')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({ name: 'electronics' })
      })

      it('should match parameter with custom pattern', () => {
        const result = LinearRouter.matchRoute('/files/image.jpg', '/files/:filename{[^/]+\\.[a-z]+}')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({ filename: 'image.jpg' })
      })
    })

    describe('Complex patterns', () => {
      it('should match mixed static and dynamic segments', () => {
        const result = LinearRouter.matchRoute('/api/v1/users/123/profile', '/api/v1/users/:id/profile')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({ id: '123' })
      })

      it('should match multiple parameters with static segments', () => {
        const result = LinearRouter.matchRoute('/api/users/123/posts/456/comments', '/api/users/:userId/posts/:postId/comments')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({ userId: '123', postId: '456' })
        expect(result!.paramIndexMap).toEqual({ userId: 0, postId: 1 })
        expect(result!.paramStash).toEqual(['123', '456'])
      })

      it('should not match when static segments differ', () => {
        const result = LinearRouter.matchRoute('/api/v2/users/123', '/api/v1/users/:id')
        expect(result).toBeNull()
      })
    })

    describe('Edge cases', () => {
      it('should handle empty path segments', () => {
        const result = LinearRouter.matchRoute('/', '/')
        expect(result).not.toBeNull()
        expect(result!.params).toEqual({})
      })

      it('should handle root path matching', () => {
        const result = LinearRouter.matchRoute('/', '/')
        expect(result).not.toBeNull()
      })

      it('should not match when path is too short', () => {
        const result = LinearRouter.matchRoute('/api', '/api/users/:id')
        expect(result).toBeNull()
      })

      it('should handle special characters in static segments', () => {
        const result = LinearRouter.matchRoute('/api-v1/users_123', '/api-v1/users_123')
        expect(result).not.toBeNull()
      })
    })

    describe('Unsupported patterns', () => {
      it('should throw UnsupportedPathError for mixed labels and wildcards', () => {
        expect(() => {
          LinearRouter.matchRoute('/users/123/files', '/users/:id/*')
        }).toThrowError(UnsupportedPathError)
      })
    })
  })
})
