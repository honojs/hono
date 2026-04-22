import { runTest } from '../common.case.test'
import { TrieRouter } from '../trie-router'
import { CacheRouter } from './router'

describe('SmartRouter', () => {
  runTest({
    newRouter: () =>
      new CacheRouter({
        router: new TrieRouter(),
        maxCacheEntries: 10,
        checkDiffOnAdd: false,
      }),
  })
})
