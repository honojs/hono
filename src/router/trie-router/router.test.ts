import { runTest } from '../common.case.test'
import { TrieRouter } from './router'

describe('TrieRouter - alternation in a constrained param', () => {
  it.each([
    ['/api/login', true],
    ['/api/health', true],
    ['/api/loginX', false],
    ['/api/xhealth', false],
  ])('Should match %s only when it equals an alternative', (path, matched) => {
    const router = new TrieRouter<string>()
    router.add('GET', '/api/:name{login|health}', 'h')
    expect(router.match('GET', path)[0].length).toBe(matched ? 1 : 0)
  })

  it('Should match an alternation followed by a static segment', () => {
    const router = new TrieRouter<string>()
    router.add('GET', '/api/:name{login|health}/x', 'h')
    expect(router.match('GET', '/api/login/x')[0].length).toBe(1)
    expect(router.match('GET', '/api/loginX/x')[0].length).toBe(0)
    expect(router.match('GET', '/api/xhealth/x')[0].length).toBe(0)
  })
})

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
