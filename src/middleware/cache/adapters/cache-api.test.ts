import type { Context } from '../../../context'
import { cacheApi } from './cache-api'
import { runAdapterContract } from './contract'

// Minimal Context stand-in. We only call cacheName(c) which doesn't read it.
const fakeCtx = {} as Context

runAdapterContract('cacheApi', async () => {
  const factory = cacheApi({ cacheName: `cache-api-contract-${Math.random()}` })
  return factory(fakeCtx)
})
