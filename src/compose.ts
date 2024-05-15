import { Context } from './context'
import type { ParamIndexMap, Params } from './router'
import type { Env, NotFoundHandler, ErrorHandler } from './types'

interface ComposeContext {
  finalized: boolean
  res: unknown
}

/**
 * Compose middleware functions into a single function.
 *
 * @template C - The context type.
 * @template E - The environment type.
 *
 * @param {[[Function, unknown], ParamIndexMap | Params][]} middleware - An array of middleware functions and their corresponding parameters.
 * @param {ErrorHandler<E>} [onError] - An optional error handler function.
 * @param {NotFoundHandler<E>} [onNotFound] - An optional not-found handler function.
 *
 * @returns {(context: C, next?: Function) => Promise<C>} - A composed middleware function.
 */
export const compose = <C extends ComposeContext, E extends Env = Env>(
  middleware: [[Function, unknown], ParamIndexMap | Params][],
  onError?: ErrorHandler<E>,
  onNotFound?: NotFoundHandler<E>
) => {
  return (context: C, next?: Function) => {
    let index = -1
    return dispatch(0)

    /**
     * Dispatch the middleware functions.
     *
     * @param {number} i - The current index in the middleware array.
     *
     * @returns {Promise<C>} - A promise that resolves to the context.
     */
    async function dispatch(i: number): Promise<C> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i

      let res
      let isError = false
      let handler

      if (middleware[i]) {
        handler = middleware[i][0][0]
        if (context instanceof Context) {
          context.req.routeIndex = i
        }
      } else {
        handler = (i === middleware.length && next) || undefined
      }

      if (!handler) {
        if (context instanceof Context && context.finalized === false && onNotFound) {
          res = await onNotFound(context)
        }
      } else {
        try {
          res = await handler(context, () => {
            return dispatch(i + 1)
          })
        } catch (err) {
          if (err instanceof Error && context instanceof Context && onError) {
            context.error = err
            res = await onError(err, context)
            isError = true
          } else {
            throw err
          }
        }
      }

      if (res && (context.finalized === false || isError)) {
        context.res = res
      }
      return context
    }
  }
}
