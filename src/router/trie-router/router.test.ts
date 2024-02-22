import { runTest } from '../common.case.test'
import { TrieRouter } from './router'

describe('TrieRouter', () => {
  runTest({
    skip: [],
    newRouter: () => new TrieRouter(),
  })
})
