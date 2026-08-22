import type { Context } from './context'
import type { Env, ErrorHandler, Next, NotFoundHandler } from './types'

/**
 * Compose middleware functions into a single function based on `koa-compose` package.
 *
 * @template E - The environment type.
 *
 * @param {[[Function, unknown], unknown][] | [[Function]][]} middleware - An array of middleware functions and their corresponding parameters.
 * @param {ErrorHandler<E>} [onError] - An optional error handler function.
 * @param {NotFoundHandler<E>} [onNotFound] - An optional not-found handler function.
 * @param {boolean} [updateRouteIndex] - Whether to update the matched route index.
 *
 * @returns {(context: Context, next?: Next) => Promise<Context>} - A composed middleware function.
 */
export const compose = <E extends Env = Env>(
  middleware: [[Function, unknown], unknown][] | [[Function]][],
  onError?: ErrorHandler<E>,
  onNotFound?: NotFoundHandler<E>,
  updateRouteIndex: boolean = true
): ((context: Context, next?: Next) => Promise<Context>) => {
  return (context, next) => {
    let index = -1

    return dispatch(0)

    /**
     * Dispatch the middleware functions.
     *
     * @param {number} i - The current index in the middleware array.
     *
     * @returns {Promise<Context>} - A promise that resolves to the context.
     */
    async function dispatch(i: number): Promise<Context> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i

      let res
      let isError = false
      const entry = middleware[i]
      const handler = entry ? entry[0][0] : (i === middleware.length && next) || undefined

      if (entry) {
        if (updateRouteIndex) {
          context.req.routeIndex = i
        }
      }

      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1))
        } catch (err) {
          if (updateRouteIndex) {
            context.req.routeIndex = i
          }
          if (!(err instanceof Error) || !onError) {
            throw err
          }
          context.error = err
          res = await onError(err, context)
          isError = true
        }
      } else if (context.finalized === false && onNotFound) {
        res = await onNotFound(context)
      }

      if (res && (context.finalized === false || isError)) {
        context.res = res
      }
      return context
    }
  }
}
