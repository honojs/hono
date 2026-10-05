import { runTest } from '../common.case.test'
import { TrieRouter } from './router'

describe('TrieRouter', () => {
  runTest({
    newRouter: () => new TrieRouter(),
  })

  describe('Capture multiple directories followed by an optional parameter', () => {
    it('Should return the handler once with the longest match', () => {
      const router = new TrieRouter<string>()
      router.add('GET', '/:path{.+}/:id?', 'optional')

      const [res] = router.match('GET', '/a/b')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('optional')
      expect(res[0][1]).toEqual({ path: 'a/b' })
    })
  })
})
