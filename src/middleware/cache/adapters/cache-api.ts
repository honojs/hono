/**
 * @module
 * Web Cache API adapter. Round-trips Response objects unchanged so the
 * Workers / Deno fast path stays zero-extra-allocation.
 */

import type { Context } from '../../../context'
import type { Envelope, KVLike, SetOptions } from '../types'

export interface CacheApiOptions {
  cacheName: string | ((c: Context) => Promise<string> | string)
}

/**
 * Returns a factory because cacheName may depend on Context. The middleware
 * calls the factory once per request
 */

export const cacheApi = (options: CacheApiOptions): ((c: Context) => Promise<KVLike>) => {
  return async (c: Context): Promise<KVLike> => {
    if (!globalThis.caches) {
      throw new Error('cacheApi: globalThis.caches is not available in this runtime')
    }
    const name =
      typeof options.cacheName === 'function' ? await options.cacheName(c) : options.cacheName
    const cache = await caches.open(name)

    return {
      async get(key: string) {
        const r = await cache.match(key)
        return r ?? null
      },
      async set(key: string, env: Envelope, _opts: SetOptions) {
        const res = new Response(env.body, { status: env.status, headers: env.headers })
        await cache.put(key, res)
      },
      async delete(key) {
        await cache.delete(key)
      },
    }
  }
}
