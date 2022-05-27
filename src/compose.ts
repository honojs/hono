import { Context } from './context'
import type { ErrorHandler, NotFoundHandler } from './hono'

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <C>(
  middleware: Function[],
  onError?: ErrorHandler,
  onNotFound?: NotFoundHandler
) => {
  return async (context: C, next?: Function) => {
    let index = -1
    return dispatch(0)
    async function dispatch(i: number): Promise<C> {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      let handler = middleware[i]
      index = i
      if (i === middleware.length && next) handler = next

      if (!handler) {
        if (context instanceof Context && context.res._finalized === false && onNotFound) {
          context.res = onNotFound(context)
          context.res._finalized = true
        }
        return Promise.resolve(context)
      }

      return Promise.resolve(handler(context, dispatch.bind(null, i + 1)))
        .then(async (res: Response) => {
          // If handler return Response like `return c.text('foo')`
          if (res && context instanceof Context) {
            context.res = res
            context.res._finalized = true
          }
          return context
        })
        .catch((err) => {
          if (context instanceof Context && onError) {
            if (err instanceof Error) {
              context.res = onError(err, context)
              context.res._finalized = true
            }
            return context
          } else {
            throw err
          }
        })
    }
  }
}
