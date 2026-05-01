/**
 * @module
 * Public types for the Hono cache middleware and its storage adapters.
 */

import type { Context } from '../../context'
import type { StatusCode } from '../../utils/http-status'

/**
 * A serialized cached response. Used by KV-shaped adapters
 * (Workers KV, Redis, in-memory). The Cache API adapter bypasses this and
 * round-trips Response directly for zero-overhead.
 */
export interface Envelope {
  status: number
  headers: Record<string, string>
  body: Uint8Array
}

export type StoreOp = 'get' | 'set' | 'delete'

export interface SetOptions {
  // Computed by the middleware from Cache-Control. Adapters MAY ignore
  ttlSeconds?: number
}

/**
 * Pluggable storage interface. Implementations:
 *   - cacheApi() returns Response on get (preserves zero-alloc fast path)
 *   - memoryStore(), workersKv(), redis() etc. return Envelope on get
 *
 * Errors thrown from these methods are caught by the middleware and routed
 * to onStoreError; they MUST NOT crash the request.
 */
export interface KVLike {
  get(key: string): Promise<Response | Envelope | null>
  set(key: string, value: Envelope, options: SetOptions): Promise<void>
  delete(key: string): Promise<void>
}

export type WriteStrategy = 'await' | 'background' | 'auto'

export type StoreErrorHook = (
  err: unknown,
  op: StoreOp,
  key: string,
  c: Context
) => void | Promise<void>

export interface CacheOptions {
  // NEW: Pluggable storage. Either provide this or cacheName
  store?: KVLike

  /**
   * @deprecated Use `store: cacheApi({ cacheName })`. Kept for backwards-compatibility
   * String or factory; when set, a CacheApi-backed store is auto-constructed.
   */
  cacheName?: string | ((c: Context) => Promise<string> | string)

  // Cache-Control directives. appended to the store & served responses
  cacheControl?: string

  // Vary header(s) appended to response AND used to disambiguate keys
  vary?: string | string[]

  // Custom cache key generator. Defaults to c.req.url
  keyGenerator?: (c: Context) => Promise<string> | string

  // Statuses cacheable beyond the default [200]
  cacheableStatusCodes?: StatusCode[]

  /**
   * - 'await'      : always await store.set before returning
   * - 'background' : never await; uses c.executionCtx.waitUntil if available
   * - 'auto'       : background when waitUntil is available, else await
   * Default: 'auto'.
   */
  writeStrategy?: WriteStrategy

  /** @deprecated Use writeStrategy: 'await' | 'background'*/
  wait?: boolean

  // Hook invoked when any store op throws. Default: console.warn
  onStoreError?: StoreErrorHook | false

  // Legacy CacheApi-only fallback. Kept for backwards-compatibility
  onCacheNotAvailable?: (() => void) | false
}
