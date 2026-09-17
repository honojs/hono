import { UnsupportedPathError } from '../../router'
import { runTest } from '../common.case.test'
import { PatternRouter } from './router'

describe('Pattern', () => {
  runTest({
    skip: [
      {
        reason: 'UnsupportedPath',
        tests: ['Duplicate param name > self'],
      },
    ],
    newRouter: () => new PatternRouter(),
  })

  describe('Duplicate param name', () => {
    it('self', () => {
      const router = new PatternRouter<string>()
      expect(() => {
        router.add('GET', '/:id/:id', 'foo')
      }).toThrowError(UnsupportedPathError)
    })
  })
  describe('Trailing slash', () => {
    const router = new PatternRouter<string>()

    beforeEach(() => {
      router.add('GET', '/book', 'GET /book')
      router.add('GET', '/book/:id', 'GET /book/:id')
    })

    it('GET /book/', () => {
      const [res] = router.match('GET', '/book/')
      expect(res.length).toBe(0)
    })
  })
})
