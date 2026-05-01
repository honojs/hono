import { memoryStore } from './memory'
import { runAdapterContract } from './contract'

runAdapterContract('memoryStore (default)', () => memoryStore())

describe('memoryStore - LRU + TTL specifics', () => {
  it('evicts oldest when over maxEntries', async () => {
    const s = memoryStore({ maxEntries: 2 })
    const env = (b: string) => ({
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: new TextEncoder().encode(b),
    })
    await s.set('a', env('A'), {})
    await s.set('b', env('B'), {})
    await s.set('c', env('C'), {})
    expect(await s.get('a')).toBeNull()
    expect(await s.get('b')).not.toBeNull()
    expect(await s.get('c')).not.toBeNull()
  })

  it('LRU: get touches recency', async () => {
    const s = memoryStore({ maxEntries: 2 })
    const env = (b: string) => ({
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: new TextEncoder().encode(b),
    })
    await s.set('a', env('A'), {})
    await s.set('b', env('B'), {})
    await s.get('a') // touch a -> most recent
    await s.set('c', env('C'), {}) // should evict b, not a
    expect(await s.get('a')).not.toBeNull()
    expect(await s.get('b')).toBeNull()
  })

  it('respects ttlSeconds', async () => {
    vi.useFakeTimers()
    const s = memoryStore()
    const env = {
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: new TextEncoder().encode('x'),
    }
    await s.set('k', env, { ttlSeconds: 5 })
    expect(await s.get('k')).not.toBeNull()
    vi.advanceTimersByTime(6_000)
    expect(await s.get('k')).toBeNull()
    vi.useRealTimers()
  })

  it('ttlSeconds=0 -> do not store', async () => {
    const s = memoryStore()
    await s.set(
      'k',
      { status: 200, headers: {}, body: new TextEncoder().encode('x') },
      { ttlSeconds: 0 }
    )
    expect(await s.get('k')).toBeNull()
  })
})