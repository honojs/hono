import type { ParamStash } from '../../router'
import { UnsupportedPathError } from '../../router'
import { runTest } from '../common.case.test'
import { RegExpRouter } from './router'

describe('RegExpRouter', () => {
  runTest({
    skip: [
      {
        reason: 'UnsupportedPath',
        tests: [
          'Duplicate param name > parent',
          'Duplicate param name > child',
          'Capture Group > Complex capturing group > GET request',
        ],
      },
      {
        reason: 'This route can not be added with `:label` to RegExpRouter. This is ambiguous',
        tests: ['Including slashes > GET /js/main.js'],
      },
    ],
    newRouter: () => new RegExpRouter(),
  })

  describe('Return value type', () => {
    it('Should return [[T, ParamIndexMap][], ParamStash]', async () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/posts/:id', 'get post')

      const [res, stash] = router.match('GET', '/posts/1')
      expect(res.length).toBe(1)
      expect(res).toEqual([['get post', { id: 1 }]])
      expect((stash as ParamStash)[1]).toBe('1')
    })
  })

  describe('UnsupportedPathError', () => {
    describe('Ambiguous', () => {
      const router = new RegExpRouter<string>()

      router.add('GET', '/:user/entries', 'get user entries')
      router.add('GET', '/entry/:name', 'get entry')
      router.add('POST', '/entry', 'create entry')

      it('GET /entry/entries', async () => {
        expect(() => {
          router.match('GET', '/entry/entries')
        }).toThrowError(UnsupportedPathError)
      })
    })

    describe('Multiple handlers with different label', () => {
      const router = new RegExpRouter<string>()

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
      const router = new RegExpRouter<string>()
      router.add('GET', '/:id/:action', 'foo')
      router.add('GET', '/posts/:id', 'bar')
      expect(() => {
        router.match('GET', '/')
      }).toThrowError(UnsupportedPathError)
    })

    it('child', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/posts/:id', 'foo')
      router.add('GET', '/:id/:action', 'bar')

      expect(() => {
        router.match('GET', '/')
      }).toThrowError(UnsupportedPathError)
    })

    describe('static and dynamic', () => {
      it('static first', () => {
        const router = new RegExpRouter<string>()
        router.add('GET', '/reg-exp/router', 'foo')
        router.add('GET', '/reg-exp/:id', 'bar')

        expect(() => {
          router.match('GET', '/')
        }).toThrowError(UnsupportedPathError)
      })

      it('long label', () => {
        const router = new RegExpRouter<string>()
        router.add('GET', '/reg-exp/router', 'foo')
        router.add('GET', '/reg-exp/:service', 'bar')

        expect(() => {
          router.match('GET', '/')
        }).toThrowError(UnsupportedPathError)
      })

      it('dynamic first', () => {
        const router = new RegExpRouter<string>()
        router.add('GET', '/reg-exp/:id', 'bar')
        router.add('GET', '/reg-exp/router', 'foo')

        expect(() => {
          router.match('GET', '/')
        }).toThrowError(UnsupportedPathError)
      })
    })

    it('different regular expression', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/:id/:action{create|update}', 'foo')
      router.add('GET', '/:id/:action{delete}', 'bar')
      expect(() => {
        router.match('GET', '/')
      }).toThrowError(UnsupportedPathError)
    })

    describe('Capture Group', () => {
      describe('Complex capturing group', () => {
        it('GET request', () => {
          const router = new RegExpRouter<string>()
          router.add('GET', '/foo/:capture{ba(r|z)}', 'ok')
          expect(() => {
            router.match('GET', '/foo/bar')
          }).toThrowError(UnsupportedPathError)
        })
      })
    })
  })
})
