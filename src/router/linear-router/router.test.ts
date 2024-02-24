import { UnsupportedPathError } from '../../router'
import { runTest } from '../common.case.test'
import { LinearRouter } from './router'

describe('LinearRouter', () => {
  runTest({
    skip: [
      {
        reason: 'UnsupportedPath',
        tests: ['Multi match > `params` per a handler > GET /entry/123/show'],
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

      it('GET /entry/123/show', async () => {
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
})
