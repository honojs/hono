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
          'Capture regex param with trailing wildcard on empty remainder > GET /123',
          'Capture regex param with trailing wildcard and sibling route > GET /regex-abc/123/ghi',
          'Trailing wildcard after a label > GET /abc',
          'Trailing wildcard after a label > GET /abc/sub',
          'Trailing wildcard after a pattern label > GET /abc',
          'Trailing wildcard after a pattern label > GET /reverse/abc in reverse registration order',
          'Trailing wildcard after a pattern label > POST /all/abc with ALL middleware',
          'Trailing wildcard after a pattern label > GET /posts/2024/comments with nested braces',
          'Trailing wildcard after a pattern label > GET /files/foo/detail with regexp meta characters',
          'Trailing wildcard after a pattern label > GET /user/123/profile with the default pattern',
          'Trailing wildcard after a pattern label > GET /user/123/profile with the default pattern in reverse registration order',
          'Complex > Parameter with {.*} regexp',
        ],
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
      router.add('GET', '/magazine/', 'GET /magazine/')
      router.add('GET', '/magazine/:id/', 'GET /magazine/:id/')
    })

    const handlers = (path: string): string[] => {
      const [res] = router.match('GET', path)
      return res.map(([handler]) => handler as string)
    }

    it('GET /book/ does not match /book under strict routing', () => {
      expect(handlers('/book/')).toEqual([])
    })

    it('GET /book/42/ does not match /book/:id under strict routing', () => {
      expect(handlers('/book/42/')).toEqual([])
    })

    it('GET /magazine/ matches /magazine/', () => {
      const matched = handlers('/magazine/')
      expect(matched).toContain('GET /magazine/')
      expect(matched).not.toContain('GET /book')
    })

    it('GET /magazine does not match /magazine/', () => {
      expect(handlers('/magazine')).toEqual([])
    })

    it('GET /magazine/42/ matches /magazine/:id/', () => {
      const [res] = router.match('GET', '/magazine/42/')
      const matched = res.map(([handler]) => handler as string)
      expect(matched).toContain('GET /magazine/:id/')
      expect(matched).not.toContain('GET /book/:id')
      const paramMatch = res.find(([handler]) => handler === 'GET /magazine/:id/')
      expect(paramMatch?.[1]['id']).toBe('42')
    })

    it('GET /magazine/42 does not match /magazine/:id/', () => {
      expect(handlers('/magazine/42')).toEqual([])
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
})
