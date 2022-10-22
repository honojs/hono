import { HonoContext } from './context.ts'
import type { Environment, NotFoundHandler, ErrorHandler } from './hono.ts'
import type { Schema } from './middleware/validator/middleware.ts'

interface ComposeContext {
  finalized: boolean
  res: unknown
}

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <
  C extends ComposeContext,
  P extends string = string,
  E extends Partial<Environment> = Environment,
  D extends Partial<Schema> = Schema
>(
  middleware: Function[],
  onNotFound?: NotFoundHandler<P, E, D>,
  onError?: ErrorHandler<P, E, D>
) => {
  const middlewareLength = middleware.length
  return (context: C, next?: Function) => {
    let index = -1
    return dispatch(0)

    function dispatch(i: number): C | Promise<C> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      let handler = middleware[i]
      index = i
      if (i === middlewareLength && next) handler = next

      let res
      let isError = false

      if (!handler) {
        if (context instanceof HonoContext && context.finalized === false && onNotFound) {
          res = onNotFound(context)
        }
      } else {
        try {
          res = handler(context, () => {
            const dispatchRes = dispatch(i + 1)
            return dispatchRes instanceof Promise ? dispatchRes : Promise.resolve(dispatchRes)
          })
        } catch (err) {
          if (err instanceof Error && context instanceof HonoContext && onError) {
            context.error = err
            res = onError(err, context)
            isError = true
          } else {
            throw err
          }
        }
      }

      if (!(res instanceof Promise)) {
        if (res && (context.finalized === false || isError)) {
          context.res = res
        }
        return context
      } else {
        return res
          .then((res) => {
            if (res && context.finalized === false) {
              context.res = res
            }
            return context
          })
          .catch((err) => {
            if (err instanceof Error && context instanceof HonoContext && onError) {
              context.error = err
              context.res = onError(err, context)
              return context
            }
            throw err
          })
      }
    }
  }
}
