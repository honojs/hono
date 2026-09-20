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
})
