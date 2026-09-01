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
 *
 * @returns {(context: Context, next?: Next) => Promise<Context>} - A composed middleware function.
 */
export const compose = <E extends Env = Env>(
  middleware: [[Function, unknown], unknown][] | [[Function]][],
  onError?: ErrorHandler<E>,
  onNotFound?: NotFoundHandler<E>
): ((context: Context, next?: Next) => Promise<Context>) => {
  return (context, next) => {
    let index = -1

    return dispatch(0)

    /**
     * Apply an error handler to the caught error and return its response.
     *
     * @param {unknown} err - The error thrown while running a handler.
     * @returns {Promise<Response | undefined>} - The error handler response, if applicable.
     */
    async function translateError(err: unknown): Promise<Response | undefined> {
      if (err instanceof Error && onError) {
        context.error = err
        return await onError(err, context)
      }
      throw err
    }

    /**
     * Execute a single middleware/handler and route any errors through the error handler.
     *
     * @param {Function} handler - The handler to run.
     * @param {number} i - The current dispatch index.
     * @returns {Promise<{ res?: Response; isError: boolean }>} - The result of running the handler.
     */
    async function runHandler(
      handler: Function,
      i: number
    ): Promise<{ res?: Response; isError: boolean }> {
      try {
        return { res: await handler(context, () => dispatch(i + 1)), isError: false }
      } catch (err) {
        const res = await translateError(err)
        return { res, isError: res !== undefined }
      }
    }

    /**
     * Resolve the not-found handler response when there is no handler for the index.
     *
     * @returns {Promise<Response | undefined>} - The not-found response, if applicable.
     */
    async function runNotFound(): Promise<Response | undefined> {
      if (context.finalized === false && onNotFound) {
        return await onNotFound(context)
      }
      return undefined
    }

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

      let res: Response | undefined
      let isError = false

      if (middleware[i]) {
        context.req.routeIndex = i
        const result = await runHandler(middleware[i][0][0], i)
        res = result.res
        isError = result.isError
      } else if (i === middleware.length && next) {
        const result = await runHandler(next, i)
        res = result.res
        isError = result.isError
      } else {
        res = await runNotFound()
      }

      if (res && (context.finalized === false || isError)) {
        context.res = res
      }
      return context
    }
  }
}
