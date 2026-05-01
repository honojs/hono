/**
 * @module
 * Cache Middleware for Hono.
 */

import type { Context } from '../../context'
import type { MiddlewareHandler } from '../../types'
import type { StatusCode } from '../../utils/http-status'
import type { CacheOptions, KVLike } from './types'
import { parseDirectiveList, parseHeaderList, shouldNotStore } from './utils'

const defaultCacheableStatusCodes: ReadonlyArray<StatusCode> = [200]

/**
 * Build the inline CacheApi-backed store. Phase 3 moves this to
 * adapters/cache-api.ts; the shape is identical.
 */

const buildInlineCacheApiStore = (
  cacheNameOpt: string | ((c: Context) => Promise<string> | string)
): ((c: Context) => Promise<KVLike>) => {
  return async (c) => {
    const name = typeof cacheNameOpt === 'function' ? await cacheNameOpt(c) : cacheNameOpt
    const cache = await caches.open(name)
    return {
      async get(key) {
        const r = await cache.match(key)
        return r ?? null
      },
      async set(key, env) {
        const res = new Response(env.body, {
          status: env.status,
          headers: env.headers,
        })
        await cache.put(key, res)
      },
      async delete(key) {
        await cache.delete(key)
      },
    }
  }
}

/**
 * Cache Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/cache}
 */

export const cache = (options: CacheOptions): MiddlewareHandler => {
  // backward compatibility: for cacheName-only usage
  if (!options.store && !options.cacheName) {
    throw new Error('cache(): either `store` or `cacheName` must be provided')
  }

  // CacheApi runtime check, only when relying on the legacy shim
  if (!options.store && !globalThis.caches) {
    if (options.onCacheNotAvailable === false) {
      // suppress
    } else if (options.onCacheNotAvailable) {
      options.onCacheNotAvailable()
    } else {
      console.log('Cache Middleware is not enabled because caches is not defined')
    }
    return async (_c, next) => await next()
  }

  // precompute setup time only state
  const cacheControlDirectives = options.cacheControl
    ? Array.from(parseDirectiveList(options.cacheControl).entries())
    : null

  const varyDirectives = parseHeaderList(options.vary)
  if (varyDirectives.includes('*')) {
    throw new Error(
      'Middleware vary configuration cannot include "*", as it disallows effective caching'
    )
  }

  const cacheableStatusCodes = new Set<number>(
    options.cacheableStatusCodes ?? defaultCacheableStatusCodes
  )

  const wait = options.wait === true

  const getStore: (c: Context) => Promise<KVLike> = options.store
    ? async () => options.store as KVLike
    : buildInlineCacheApiStore(options.cacheName!)

  // Response header writing (preserves existing behavior exactly)
  const addHeader = (c: Context) => {
    if (cacheControlDirectives) {
      const existing = parseDirectiveList(c.res.headers.get('Cache-Control'))
      for (const [name, value] of cacheControlDirectives) {
        if (!existing.has(name)) {
          c.header('Cache-Control', `${name}${value !== undefined ? `=${value}` : ''}`, {
            append: true,
          })
        }
      }
    }
    if (varyDirectives.length) {
      const existing = parseHeaderList(c.res.headers.get('Vary'))
      const merged = Array.from(new Set([...existing, ...varyDirectives])).sort()
      if (merged.includes('*')) {
        c.header('Vary', '*')
      } else {
        c.header('Vary', merged.join(', '))
      }
    }
  }

  // Skip rules: reuse shouldNotStore + Vary:* + Set-Cookie
  const shouldSkip = (res: Response): boolean => {
    const vary = res.headers.get('Vary')
    if (vary && vary.split(',').some((v) => v.trim() === '*')) {
      return true
    }
    if (shouldNotStore(res.headers.get('Cache-Control'))) {
      return true
    }
    if (res.headers.has('Set-Cookie')) {
      return true
    }
    return false
  }

  // Envelope serialization for KV-shaped stores
  const toEnvelope = async (res: Response) => {
    const body = new Uint8Array<ArrayBuffer>(await res.clone().arrayBuffer())
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => {
      headers[k] = v
    })
    return { status: res.status, headers, body }
  }

  // Main handler
  return async function cache(c, next) {
    const userKey = options.keyGenerator ? await options.keyGenerator(c) : c.req.url
    const store = await getStore(c)

    const cached = await store.get(userKey)
    if (cached) {
      if (cached instanceof Response) {
        return new Response(cached.body, cached)
      }
      return new Response(cached.body, { status: cached.status, headers: cached.headers })
    }

    await next()

    if (!cacheableStatusCodes.has(c.res.status)) {
      return
    }
    addHeader(c)
    if (shouldSkip(c.res)) {
      return
    }

    const env = await toEnvelope(c.res)
    const writePromise = store.set(userKey, env, {})
    if (wait) {
      await writePromise
    } else {
      c.executionCtx.waitUntil(writePromise)
    }
  }
}
