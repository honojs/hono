/**
 * @module
 * Rate Limiter Middleware for Hono.
 */

import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'

/**
 * Interface for custom rate limit store implementations.
 * Allows plugging in external stores such as Redis or Memcached.
 */
export interface RateLimitStore {
  /**
   * Increment the hit count for a key and return the updated count and reset time.
   * If the key does not exist, it should be created with count 1.
   *
   * @param key - Unique identifier for the rate limit bucket.
   * @param windowMs - The window duration in milliseconds.
   * @returns An object with the current `count` and the Unix timestamp (ms) when the window `resets`.
   */
  increment(key: string, windowMs: number): Promise<{ count: number; resets: number }>
}

/**
 * Built-in in-memory store using a Map. Suitable for single-process deployments.
 * For multi-instance deployments, use a shared external store (e.g. Redis).
 */
export class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; resets: number }>()

  async increment(key: string, windowMs: number): Promise<{ count: number; resets: number }> {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || entry.resets <= now) {
      const resets = now + windowMs
      this.store.set(key, { count: 1, resets })
      return { count: 1, resets }
    }

    entry.count++
    return { count: entry.count, resets: entry.resets }
  }
}

/**
 * Information about the current rate limit state, available via `c.get('rateLimit')`.
 */
export type RateLimitInfo = {
  /** The configured maximum number of requests allowed per window. */
  limit: number
  /** The number of requests remaining in the current window. */
  remaining: number
  /** Unix timestamp (ms) when the current window resets. */
  resets: number
  /** Whether the request was rate limited. */
  limited: boolean
}

export type RateLimitVariables = {
  rateLimit: RateLimitInfo
}

declare module '../..' {
  interface ContextVariableMap extends RateLimitVariables {}
}

type RateLimitOptions = {
  /**
   * Time window duration in milliseconds.
   * @default 60_000
   */
  windowMs?: number
  /**
   * Maximum number of requests allowed per window per key.
   * @default 10
   */
  limit?: number
  /**
   * Function to derive a unique key from the request context.
   * Defaults to using the `X-Forwarded-For` header or falling back to `'global'`.
   */
  keyGenerator?: (c: Context) => string | Promise<string>
  /**
   * Custom handler invoked when a request is rate limited.
   * Defaults to throwing an HTTPException with status 429.
   */
  onError?: (c: Context, next: Function, info: RateLimitInfo) => Response | Promise<Response>
  /**
   * Whether to set standard `RateLimit-*` response headers.
   * @default true
   */
  standardHeaders?: boolean
  /**
   * Custom store for persisting rate limit state.
   * Defaults to an in-memory store (not suitable for multi-instance deployments).
   */
  store?: RateLimitStore
}

const defaultKeyGenerator = (c: Context): string => {
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return 'global'
}

/**
 * Rate Limiter Middleware for Hono.
 *
 * Uses a fixed-window algorithm. For multi-instance deployments, provide a shared `store`.
 *
 * @param {RateLimitOptions} [options] - Configuration options.
 * @param {number} [options.windowMs=60000] - Time window in milliseconds.
 * @param {number} [options.limit=10] - Max requests per window per key.
 * @param {Function} [options.keyGenerator] - Function to generate a unique key per client.
 * @param {Function} [options.onError] - Handler called when a request is rate limited.
 * @param {boolean} [options.standardHeaders=true] - Set `RateLimit-*` response headers.
 * @param {RateLimitStore} [options.store] - Custom store (defaults to in-memory).
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { rateLimiter } from 'hono/rate-limiter'
 *
 * const app = new Hono()
 *
 * app.use(
 *   rateLimiter({
 *     windowMs: 60_000, // 1 minute
 *     limit: 100,       // 100 requests per minute
 *   })
 * )
 *
 * app.get('/', (c) => c.text('Hello!'))
 * ```
 *
 * @example Custom key generator (rate limit by user ID):
 * ```ts
 * app.use(
 *   rateLimiter({
 *     keyGenerator: (c) => c.get('userId') ?? c.req.header('x-forwarded-for') ?? 'global',
 *   })
 * )
 * ```
 */
export const rateLimiter = ({
  windowMs = 60_000,
  limit = 10,
  keyGenerator = defaultKeyGenerator,
  onError,
  standardHeaders = true,
  store = new MemoryStore(),
}: RateLimitOptions = {}): MiddlewareHandler => {
  return async function rateLimiter(c, next) {
    const key = await keyGenerator(c)
    const { count, resets } = await store.increment(key, windowMs)

    const remaining = Math.max(0, limit - count)
    const info: RateLimitInfo = { limit, remaining, resets, limited: count > limit }

    c.set('rateLimit', info)

    if (standardHeaders) {
      c.header('RateLimit-Limit', String(limit))
      c.header('RateLimit-Remaining', String(remaining))
      c.header('RateLimit-Reset', String(Math.ceil(resets / 1000)))
      if (count > limit) {
        c.header('RateLimit-Policy', `${limit};w=${Math.ceil(windowMs / 1000)}`)
      }
    }

    if (count > limit) {
      if (onError) {
        return onError(c, next, info)
      }
      throw new HTTPException(429, { message: 'Too Many Requests' })
    }

    await next()
  }
}
