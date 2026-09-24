/**
 * @module
 * Timeout Middleware for Hono.
 */

import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'

const controllers = new WeakMap<Context, AbortController>()

/**
 * Returns the signal shared by timeout middleware for this context, or undefined
 * if timeout middleware has not run. Pass it to operations that support cancellation.
 * The first active timeout aborts it with the same exception passed to onError.
 * Nested timeouts share the signal and keep their existing independent durations.
 *
 * Timers are cleared when downstream middleware finishes. Successful responses do
 * not abort the signal, including bodies that are still streaming. This signal
 * does not impose a time limit on streaming after downstream middleware returns.
 * It does not stop arbitrary JavaScript or APIs that do not consume the signal.
 * Downstream cancellation errors still follow normal error handling and can reach
 * onError separately from the timeout itself.
 *
 * The incoming request signal is unchanged. To also cancel on client disconnect,
 * combine the signals with AbortSignal.any where supported by your runtime.
 * Whether client disconnects abort the request signal depends on the adapter.
 *
 * @param {Context} context - The current request context.
 * @returns {AbortSignal | undefined} The timeout signal, if available.
 *
 * @example
 * ```ts
 * app.use(timeout(5000))
 * app.get('/proxy', async (c) => {
 *   const signal = getTimeoutSignal(c)!
 *   return fetch('https://example.com', {
 *     signal: AbortSignal.any([signal, c.req.raw.signal]),
 *   })
 * })
 * ```
 */
export const getTimeoutSignal = (context: Context): AbortSignal | undefined =>
  controllers.get(context)?.signal

export type HTTPExceptionFunction = (context: Context) => HTTPException

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
    const controller = controllers.get(context) ?? new AbortController()
    controllers.set(context, controller)
    let timer: number | undefined
    const timeoutPromise = new Promise<void>((_, reject) => {
      timer = setTimeout(() => {
        const error = typeof exception === 'function' ? exception(context) : exception
        // Settle the timeout first, before cancellation can settle downstream work.
        reject(error)
        controller.abort(error)
      }, duration) as unknown as number
    })

    try {
      await Promise.race([next(), timeoutPromise])
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    }
  }
}
