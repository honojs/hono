import { UnsupportedPathError } from '../../router'
import { runTest } from '../common.case.test'
import { LinearRouter } from './router'

describe('LinearRouter', () => {
  runTest({
    skip: [
      {
        reason: 'UnsupportedPath',
        tests: [
          'Capture regex pattern has trailing wildcard > GET /foo/bar/file.html',
          'Trailing wildcard after a middle wildcard > GET /acme/x/y with a named parameter',
          'Complex > Parameter with {.*} regexp',
          'Path segment equal to a pattern token > Named parameter with a trailing wildcard',
        ],
      },
    ],
    newRouter: () => new LinearRouter(),
  })

  describe('Trailing wildcard after parameters', () => {
    it.each([
      ['/:tenant/*', '/acme', { tenant: 'acme' }],
      ['/:tenant/*', '/acme/', { tenant: 'acme' }],
      ['/:tenant/*', '/acme/items/123', { tenant: 'acme' }],
      ['/:tenant/:id/*', '/acme/123/details', { tenant: 'acme', id: '123' }],
      ['/:tenant/admin/*', '/acme/admin', { tenant: 'acme' }],
      ['/:tenant/admin/*', '/acme/admin/users', { tenant: 'acme' }],
      ['/:tenant{[a-z]+}/*', '/acme/', { tenant: 'acme' }],
      ['/:tenant{[a-z]+}/*', '/acme/items', { tenant: 'acme' }],
      ['/:tenant{[a-z]+?}/*', '/acme', { tenant: 'acme' }],
      ['/:tenant{[a-z]+?}/*', '/acme/', { tenant: 'acme' }],
      ['/:tenant{[a-z]+?}/*', '/acme/items', { tenant: 'acme' }],
      ['/:tenant{[a-z]+?}/:id/*', '/acme/123/detail', { tenant: 'acme', id: '123' }],
      ['/:tenant{[a-z]+?}/:id/*', '/acme/123', { tenant: 'acme', id: '123' }],
      ['/:tenant{[a-z]+?}/:id{[0-9]+?}/*', '/acme/123/detail', { tenant: 'acme', id: '123' }],
      ['/:tenant{[a-z]+?}/items/*', '/acme/items/detail', { tenant: 'acme' }],
      ['/:tenant{a|acme}/*', '/acme/items', { tenant: 'acme' }],
      ['/:tenant{[a-z]{2,}?}/*', '/acme/items', { tenant: 'acme' }],
      ['/:tenant{(.+?)\\1}/*', '/acmeacme/items', { tenant: 'acmeacme' }],
      ['/:id{[0-9]+$}/*', '/123', { id: '123' }],
      ['/:id{[0-9]+$}/*', '/123/', { id: '123' }],
      ['/:id{[0-9]+$}/*', '/123/bar', { id: '123' }],
      ['/:id{^[0-9]+$}/*', '/123/bar', { id: '123' }],
      ['/:id{(?:[0-9]+$)}/*', '/123/bar', { id: '123' }],
      ['/:id{[0-9]+$(?=)}/*', '/123/bar', { id: '123' }],
      ['/:id{[0-9]+$}/:name/*', '/123/book/detail', { id: '123', name: 'book' }],
      ['/:id{[0-9]+$}/:name/*', '/123/book/456', { id: '123', name: 'book' }],
      ['/:id{(?:[0-9]+$|foo/bar)}/*', '/123/foo/bar', { id: '123' }],
      ['/:id{[0-9]+\\$}/*', '/123$/bar', { id: '123$' }],
      ['/:id{[0-9$]+}/*', '/123$/bar', { id: '123$' }],
      ['/:id{([0-9]+)\\1$}/*', '/123123/bar', { id: '123123' }],
      ['/:id{[0-9]+(?!/)}/*', '/123/bar', { id: '123' }],
      ['/:id{foo/bar$}/*', '/foo/bar', { id: 'foo/bar' }],
    ] as const)('Should match %s against %s', (route, path, params) => {
      const router = new LinearRouter<string>()
      router.add('GET', route, 'handler')
      expect(router.match('GET', path)[0]).toEqual([['handler', params]])
    })

    it.each([
      ['/:tenant/*', '/'],
      ['/:tenant/*', '//items'],
      ['/api/:tenant/*', '/api/'],
      ['/api/:tenant/*', '/apix/acme'],
      ['/:tenant/admin/*', '/acme/administrator'],
      ['/:tenant{[a-z]+}/*', '/acme123/items'],
      ['/:tenant{[a-z]+?}/*', '/acme123/items'],
      ['/:tenant{[a-z]+?}/:id/*', '/acme123/123/detail'],
      ['/:tenant{[a-z]+?}/:id/*', '/acme'],
      ['/:tenant{[a-z]+?}/:id/*', '/acme//detail'],
      ['/:tenant{[a-z]+?}/:id{[0-9]+?}/*', '/acme/123abc/detail'],
      ['/:tenant{a|acme}/*', '/acme123/items'],
      ['/posts/:year{[0-9]{4}}/*', '/posts/20245/comments'],
      ['/:id{[0-9]+$}/*', '/abc'],
      ['/:id{[0-9]+$}/*', '/123abc'],
      ['/:id{[0-9]+$}/*', '/abc123'],
      ['/:id{[0-9]+$}/*', '/123abc/bar'],
      ['/:id{[0-9]+$}/*', '/abc/123'],
      ['/:id{[0-9]+$}/*', '//123'],
      ['/:id{[0-9]+$}/*', '/123abc/456'],
      ['/:id{foo/bar$}/*', '/foo/bar/baz'],
    ])('Should not match %s against %s', (route, path) => {
      const router = new LinearRouter<string>()
      router.add('GET', route, 'handler')
      expect(router.match('GET', path)[0]).toEqual([])
    })

    it.each(['/:tenant/*/items', '/:tenant/*/*', '/:tenant*', '/:tenant{.*}', '/:tenant{.*}/*'])(
      'Should reject unsupported wildcard combinations in %s',
      (route) => {
        const router = new LinearRouter<string>()
        expect(() => router.add('GET', route, 'handler')).toThrowError(UnsupportedPathError)
        expect(router.match('GET', '/acme/items')[0]).toEqual([])
      }
    )
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
})
