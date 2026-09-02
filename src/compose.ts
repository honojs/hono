import type { Context } from './context'
import type { Env, ErrorHandler, Next, NotFoundHandler } from './types'

/**
 * Build the `dispatch` stepper that advances through middleware one step at a time,
 * handles errors via `translateError`, and falls back to the not-found handler.
 *
 * @template E - The environment type.
 */
const buildDispatch = <E extends Env = Env>(
  context: Context,
  middleware: [[Function, unknown], unknown][] | [[Function]][],
  next: Next | undefined,
  onError: ErrorHandler<E> | undefined,
  onNotFound: NotFoundHandler<E> | undefined
): ((i: number) => Promise<Context>) => {
  let index = -1

  async function translateError(err: unknown): Promise<Response | undefined> {
    if (err instanceof Error && onError) {
      context.error = err
      return await onError(err, context)
    }
    throw err
  }

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
    } else if (context.finalized === false && onNotFound) {
      res = await onNotFound(context)
    }

    if (res && (context.finalized === false || isError)) {
      context.res = res
    }
    return context
  }

  return dispatch
}

/**
 * Build a dispatcher closure that steps through middleware, handles errors,
 * and falls back to the not-found handler.
 *
 * @template E - The environment type.
 *
 * @param {[[Function, unknown], unknown][] | [[Function]][]} middleware - Middleware array.
 * @param {ErrorHandler<E>} [onError] - Optional error handler.
 * @param {NotFoundHandler<E>} [onNotFound] - Optional not-found handler.
 *
 * @returns {(context: Context, next?: Next) => Promise<Context>} - The executor function.
 */
const buildDispatcher = <E extends Env = Env>(
  middleware: [[Function, unknown], unknown][] | [[Function]][],
  onError?: ErrorHandler<E>,
  onNotFound?: NotFoundHandler<E>
): ((context: Context, next?: Next) => Promise<Context>) => {
  return (context, next) => {
    const dispatch = buildDispatch(context, middleware, next, onError, onNotFound)
    return dispatch(0)
  }
}

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
  return buildDispatcher(middleware, onError, onNotFound)
}
