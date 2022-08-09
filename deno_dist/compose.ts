import { HonoContext } from './context.ts'
import type { ErrorHandler, NotFoundHandler } from './hono.ts'

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <C>(
  middleware: Function[],
  onError?: ErrorHandler,
  onNotFound?: NotFoundHandler
) => {
  const middlewareLength = middleware.length
  return (context: C, next?: Function) => {
    let index = -1
    return dispatch(0)
    async function dispatch(i: number): Promise<C> {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      let handler = middleware[i]
      index = i
      if (i === middlewareLength && next) handler = next

      if (!handler) {
        if (context instanceof HonoContext && context.finalized === false && onNotFound) {
          context.res = await onNotFound(context)
        }
        return Promise.resolve(context)
      }

      return Promise.resolve(handler(context, () => dispatch(i + 1)))
        .then((res: Response) => {
          // If handler return Response like `return c.text('foo')`
          if (res && context instanceof HonoContext) {
            context.res = res
          }
          return context
        })
        .catch((err) => {
          if (context instanceof HonoContext && onError) {
            if (err instanceof Error) {
              context.res = onError(err, context)
            }
            return context
          } else {
            throw err
          }
        })
    }
  }
}
