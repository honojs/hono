/**
 * @module
 * In-memory bounded-LRU adapter for the cache middleware.
 * Uses Map insertion order as recency. Lazy TTL on read. No timers
 * (timers are problematic in serverless and not allowed on Workers).
 */

import type { Envelope, KVLike, SetOptions } from '../types'

export interface MemoryStoreOptions {
  // Hard cap on number of entries. Default 1000
  maxEntries?: number
  // Fallback TTL when the response has no Cache-Control max age
  defaultTtlSeconds?: number
}

interface MemoryEntry {
  env: Envelope
  expiresAt: number | undefined // ms epoch, undefined = no expiry
}

const NO_LIMIT = Number.POSITIVE_INFINITY

export const memoryStore = (options: MemoryStoreOptions = {}): KVLike => {
  const maxEntries = options.maxEntries ?? 1000
  const cap = maxEntries > 0 ? maxEntries : NO_LIMIT
  const defaultTtlMs =
    options.defaultTtlSeconds && options.defaultTtlSeconds > 0
      ? options.defaultTtlSeconds * 1000
      : undefined
  const map = new Map<string, MemoryEntry>()

  return {
    async get(key) {
      const entry = map.get(key)
      if (!entry) {
        return null
      }
      if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
        map.delete(key)
        return null
      }
      // LRU touch: re-insert to move to most recent end
      map.delete(key)
      map.set(key, entry)
      return entry.env
    },

    async set(key, env, opts: SetOptions) {
      let expiresAt: number | undefined
      if (typeof opts.ttlSeconds === 'number' && opts.ttlSeconds >= 0) {
        if (opts.ttlSeconds === 0) {
          // max-age = 0 -> DO NOT STORE
          map.delete(key)
          return
        }
        expiresAt = Date.now() + opts.ttlSeconds * 1000
      } else if (defaultTtlMs !== undefined) {
        expiresAt = Date.now() + defaultTtlMs
      }
      // If updating, delete first so the key moves to most recent end
      map.delete(key)
      map.set(key, { env, expiresAt })
      // Evict oldest until under cap
      while (map.size > cap) {
        const oldest = map.keys().next().value
        if (oldest === undefined) {
          break
        }
        map.delete(oldest)
      }
    },

    async delete(key) {
      map.delete(key)
    },
  }
}
