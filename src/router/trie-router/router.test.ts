import { runTest } from '../common.case.test'
import { TrieRouter } from './router'

describe('TrieRouter', () => {
  runTest({
    newRouter: () => new TrieRouter(),
  })
})

describe('TrieRouter - method names from Object.prototype', () => {
  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'Should not match or mutate anything for the method %s',
    (method) => {
      const router = new TrieRouter<string>()
      router.add('GET', '/users/me', 'me')
      router.add('GET', '/users/:id', 'id')

      expect(router.match(method, '/users/me')).toEqual([[]])
      expect(Object.hasOwn(Object.prototype, 'params')).toBe(false)
      expect(router.match('GET', '/users/me')[0].map(([h]) => h)).toEqual(['me', 'id'])
    }
  )
})
