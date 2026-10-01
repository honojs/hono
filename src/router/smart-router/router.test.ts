import { runTest } from '../common.case.test'
import { RegExpRouter } from '../reg-exp-router'
import { TrieRouter } from '../trie-router'
import { SmartRouter } from './router'

describe('SmartRouter', () => {
  runTest({
    newRouter: () =>
      new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
      }),
  })

  it.each(['\n', '\r', '\u2028', '\u2029'])(
    'should fall back for a static path containing a line terminator: %j',
    (lineBreak) => {
      const trieRouter = new TrieRouter<string>()
      const router = new SmartRouter({ routers: [new RegExpRouter<string>(), trieRouter] })
      const path = `/a/foo${lineBreak}bar`
      router.add('ALL', '/:x{a}/*', 'middleware')
      router.add('GET', path, 'static')
      router.add('GET', '/ok', 'other')

      expect(router.match('GET', '/ok')).toEqual([[['other', {}]]])
      expect(router.activeRouter).toBe(trieRouter)
      expect(router.match('GET', path)).toEqual([
        [
          ['middleware', { x: 'a' }],
          ['static', {}],
        ],
      ])
      expect(router.match('GET', '/ok')).toEqual([[['other', {}]]])
    }
  )
})
