import type { ParamIndexMap, ParamStash } from '../../router'
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
          'Capture complex multiple directories > GET /part1/middle-b/latest',
          'Capture complex multiple directories > GET /part1/middle-b/end-c/latest',
          'Complex > Parameter with {.*} regexp',
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
    it('Should return [[T, ParamIndexMap][], ParamStash]', () => {
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
      it('GET /entry/:name', () => {
        const router = new RegExpRouter<string>()
        router.add('GET', '/:user/entries', 'get user entries')
        expect(() => {
          router.add('GET', '/entry/:name', 'get entry')
        }).toThrowError(UnsupportedPathError)
      })
    })

    describe('Multiple handlers with different label', () => {
      it('GET /:class/:id', () => {
        const router = new RegExpRouter<string>()
        router.add('GET', '/:type/:id', ':type')
        expect(() => {
          router.add('GET', '/:class/:id', ':class')
        }).toThrowError(UnsupportedPathError)
      })
    })

    it('parent', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/:id/:action', 'foo')
      expect(() => {
        router.add('GET', '/posts/:id', 'bar')
      }).toThrowError(UnsupportedPathError)
    })

    it('child', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/posts/:id', 'foo')
      expect(() => {
        router.add('GET', '/:id/:action', 'bar')
      }).toThrowError(UnsupportedPathError)
    })

    describe('static and dynamic', () => {
      it('static first', () => {
        const router = new RegExpRouter<string>()
        router.add('GET', '/reg-exp/router', 'foo')
        expect(() => {
          router.add('GET', '/reg-exp/:id', 'bar')
        }).toThrowError(UnsupportedPathError)
      })

      it('long label', () => {
        const router = new RegExpRouter<string>()
        router.add('GET', '/reg-exp/router', 'foo')
        expect(() => {
          router.add('GET', '/reg-exp/:service', 'bar')
        }).toThrowError(UnsupportedPathError)
      })

      it('dynamic first', () => {
        const router = new RegExpRouter<string>()
        router.add('GET', '/reg-exp/:id', 'bar')
        expect(() => {
          router.add('GET', '/reg-exp/router', 'foo')
        }).toThrowError(UnsupportedPathError)
      })
    })

    it('different regular expression', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/:id/:action{create|update}', 'foo')
      expect(() => {
        router.add('GET', '/:id/:action{delete}', 'bar')
      }).toThrowError(UnsupportedPathError)
    })

    it('ALL route added after a specific-method route', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/foo/:a', 'foo')
      expect(() => {
        router.add('ALL', '/foo/:b', 'bar')
      }).toThrowError(UnsupportedPathError)
    })

    it('specific-method route added after an ALL route', () => {
      const router = new RegExpRouter<string>()
      router.add('ALL', '/reg-exp/router', 'foo')

      expect(() => {
        router.add('GET', '/reg-exp/:id', 'bar')
      }).toThrowError(UnsupportedPathError)
    })

    it('different methods do not conflict', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/reg-exp/router', 'foo')
      router.add('POST', '/reg-exp/:id', 'bar')

      expect(router.match('GET', '/reg-exp/router')[0][0][0]).toBe('foo')
      expect(router.match('POST', '/reg-exp/router')[0][0][0]).toBe('bar')
    })

    describe('Capture Group', () => {
      describe('Complex capturing group', () => {
        it('GET request', () => {
          const router = new RegExpRouter<string>()
          expect(() => {
            router.add('GET', '/foo/:capture{ba(r|z)}', 'ok')
          }).toThrowError(UnsupportedPathError)
        })
      })
    })
  })

  describe('Wildcard after label', () => {
    it('Should be able to add a tail wildcard after a label', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/api/:x', 'label')
      router.add('GET', '/api/*', 'wildcard')

      const [res] = router.match('GET', '/api/foo')
      expect(res.length).toBe(2)
      expect(res[0][0]).toBe('label')
      expect(res[1][0]).toBe('wildcard')
    })

    it('Should prioritize the only wildcard over the tail wildcard regardless of the order', () => {
      for (const paths of [
        ['/a*', '/a/*'],
        ['/a/*', '/a*'],
      ]) {
        const router = new RegExpRouter<string>()
        for (const path of paths) {
          router.add('GET', path, path)
        }
        const [res] = router.match('GET', '/a')
        expect(res[0][0]).toBe('/a*')
      }
    })
  })

  describe('Single character regexp pattern', () => {
    it('Should capture a param even if a static path created the node first', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/a/c', 'static')
      router.add('GET', '/:x{a}/b', 'pattern')

      const [res, stash] = router.match('GET', '/a/b')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('pattern')
      expect((stash as ParamStash)[(res[0][1] as ParamIndexMap)['x']]).toBe('a')
    })

    it('Should throw an error when a pattern terminal conflicts with a static terminal', () => {
      for (const paths of [
        ['/a', '/:x{a}'],
        ['/:x{a}', '/a'],
      ]) {
        const router = new RegExpRouter<string>()
        router.add('GET', paths[0], paths[0])
        expect(() => {
          router.add('GET', paths[1], paths[1])
        }).toThrowError(UnsupportedPathError)
      }
    })

    it('Should coexist with static paths regardless of the order', () => {
      for (const paths of [
        ['/foo/bar', '/:y{b}'],
        ['/:y{b}', '/foo/bar'],
      ]) {
        const router = new RegExpRouter<string>()
        for (const path of paths) {
          router.add('GET', path, path)
        }
        expect(router.match('GET', '/foo/bar')[0][0][0]).toBe('/foo/bar')
        expect(router.match('GET', '/b')[0][0][0]).toBe('/:y{b}')
      }
    })

    it('Should coexist with dynamic paths regardless of the order', () => {
      for (const paths of [
        ['/foo/:p', '/:x{a}'],
        ['/:x{a}', '/foo/:p'],
      ]) {
        const router = new RegExpRouter<string>()
        for (const path of paths) {
          router.add('GET', path, path)
        }
        expect(router.match('GET', '/a')[0][0][0]).toBe('/:x{a}')
        expect(router.match('GET', '/foo/v')[0][0][0]).toBe('/foo/:p')
      }
    })

    it('Should throw an error for a single meta character pattern', () => {
      const router = new RegExpRouter<string>()
      expect(() => {
        router.add('GET', '/:x{.}', 'meta')
      }).toThrowError(UnsupportedPathError)
    })
  })

  describe('Capture a param of a label node created by a middle wildcard', () => {
    it('Should capture the param', () => {
      const router = new RegExpRouter<string>()
      router.add('GET', '/w/*/x', 'wildcard')
      router.add('GET', '/w/:id/y', 'label')

      const [res, stash] = router.match('GET', '/w/123/y')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('label')
      expect((stash as ParamStash)[(res[0][1] as ParamIndexMap)['id']]).toBe('123')
    })
  })

  describe('Static path including a colon in the middle', () => {
    it('Should be treated as a static path', () => {
      for (const paths of [
        ['/v1/name:activate', '/v1/name2'],
        ['/v1/name2', '/v1/name:activate'],
      ]) {
        const router = new RegExpRouter<string>()
        for (const path of paths) {
          router.add('GET', path, path)
        }
        expect(router.match('GET', '/v1/name:activate')[0][0][0]).toBe('/v1/name:activate')
        expect(router.match('GET', '/v1/name2')[0][0][0]).toBe('/v1/name2')
      }
    })
  })
})
