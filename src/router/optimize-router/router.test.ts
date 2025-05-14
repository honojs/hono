import { runTest } from '../common.case.test'
import { TrieRouter } from '../trie-router'
import { OptimizeRouter } from './router'

describe('OptimizeRouter', () => {
  runTest({
    newRouter: () =>
      new OptimizeRouter({
        router: new TrieRouter(),
      }),
  })
})
