/**
 * @module
 * Timeout Middleware for Hono.
 */

import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'

export type HTTPExceptionFunction = (context: Context) => HTTPException

export type TimeoutVariables = {
  /** The earliest timeout deadline, in milliseconds relative to `performance.timeOrigin`. */
  timeoutDeadline?: number
}

declare module '../..' {
  interface ContextVariableMap extends TimeoutVariables {}
}

/**
 * Get the remaining timeout duration in milliseconds.
 *
 * Returns `undefined` when no timeout is set and `0` once the deadline has
 * passed. Nested middleware uses the earliest deadline. On completion before
 * expiry, the enclosing deadline is restored. An expired deadline is retained
 * so downstream work that continues after a timeout still sees `0`.
 * This does not cancel downstream work.
 *
 * @param {Context} c - The context of the request.
 * @returns {number | undefined} The remaining milliseconds, or `undefined` if no timeout is set.
 *
 * @example
 * ```ts
 * import { timeout, getTimeoutRemainingTime } from 'hono/timeout'
 *
 * app.use(timeout(60_000))
 * app.get('/', async (c) => {
 *   const remaining = getTimeoutRemainingTime(c)
 *   // Reserve 100 ms for the response. Recompute before each operation or retry.
 *   const duration = Math.min(5_000, Math.max(0, (remaining ?? Infinity) - 100))
 *   if (duration === 0) {
 *     return c.text('Gateway Timeout', 504)
 *   }
 *   const result = await fetchData({ timeout: duration })
 *   return c.json(result)
 * })
 * ```
 */
export const getTimeoutRemainingTime = (c: Context): number | undefined => {
  const deadline = c.get('timeoutDeadline')
  return deadline === undefined ? undefined : Math.max(0, deadline - performance.now())
}

const defaultTimeoutException = new HTTPException(504, {
  message: 'Gateway Timeout',
})

/**
 * Timeout Middleware for Hono.
 *
 * @param {number} duration - The timeout duration in milliseconds.
 * @param {HTTPExceptionFunction | HTTPException} [exception=defaultTimeoutException] - The exception to throw when the timeout occurs. Can be a function that returns an HTTPException or an HTTPException object.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(
 *   '/long-request',
 *   timeout(5000) // Set timeout to 5 seconds
 * )
 *
 * app.get('/long-request', async (c) => {
 *   await someLongRunningFunction()
 *   return c.text('Completed within time limit')
 * })
 * ```
 */
export const timeout = (
  duration: number,
  exception: HTTPExceptionFunction | HTTPException = defaultTimeoutException
): MiddlewareHandler => {
  return async function timeout(context, next) {
    const previousDeadline = context.get('timeoutDeadline')
    context.set(
      'timeoutDeadline',
      Math.min(previousDeadline ?? Infinity, performance.now() + duration)
    )
    let timer: number | undefined
    const timeoutPromise = new Promise<void>((_, reject) => {
      timer = setTimeout(() => {
        context.set(
          'timeoutDeadline',
          Math.min(context.get('timeoutDeadline') ?? Infinity, performance.now())
        )
        reject(typeof exception === 'function' ? exception(context) : exception)
      }, duration) as unknown as number
    })

    try {
      await Promise.race([next(), timeoutPromise])
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      if ((getTimeoutRemainingTime(context) ?? 0) > 0) {
        context.set('timeoutDeadline', previousDeadline)
      }
    }
  }
}
