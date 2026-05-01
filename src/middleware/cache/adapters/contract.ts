/**
 * @module
 * Shared adapter contract test bed. Every KVLike adapter (CacheApi, memory,
 * Workers KV, Redis) MUST pass this suite to guarantee semantic parity.
 */

import type { Envelope, KVLike } from '../types'
import { describe, it, beforeEach, expect } from 'vitest'

const env = (status: number, body: string, headers: Record<string, string> = {}): Envelope => ({
  status,
  headers: { 'content-type': 'text/plain', ...headers },
  body: new TextEncoder().encode(body),
})

const readBody = async (r: Response | Envelope): Promise<string> => {
  if (r instanceof Response) {
    return r.text()
  }
  return new TextDecoder().decode(r.body)
}

export const runAdapterContract = (
  name: string,
  factory: () => Promise<KVLike> | KVLike
): void => {
  describe(`KVLike contract: ${name}`, () => {
    let store: KVLike
    beforeEach(async () => {
      store = await factory()
    })

    it('get returns null for missing keys', async () => {
      expect(await store.get('missing')).toBeNull()
    })

    it('set then get round-trips', async () => {
      await store.set('k1', env(200, 'hello'), {})
      const got = await store.get('k1')
      expect(got).not.toBeNull()
      expect(await readBody(got!)).toBe('hello')
    })

    it('delete removes a key', async () => {
      await store.set('k1', env(200, 'x'), {})
      await store.delete('k1')
      expect(await store.get('k1')).toBeNull()
    })

    it('set is overwrite-by-key', async () => {
      await store.set('k1', env(200, 'first'), {})
      await store.set('k1', env(200, 'second'), {})
      const got = await store.get('k1')
      expect(await readBody(got!)).toBe('second')
    })

    it('preserves status and headers', async () => {
      await store.set('k1', env(201, 'created', { 'x-custom': 'y' }), {})
      const got = await store.get('k1')
      if (got instanceof Response) {
        expect(got.status).toBe(201)
        expect(got.headers.get('x-custom')).toBe('y')
      } else {
        expect(got!.status).toBe(201)
        expect(got!.headers['x-custom']).toBe('y')
      }
    })
  })
}