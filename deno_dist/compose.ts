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
        throw new Error('next() called multiple times')
      }
      let handler = middleware[i]
      index = i
      if (i === middlewareLength && next) handler = next

      if (!handler) {
        if (context instanceof HonoContext && context.finalized === false && onNotFound) {
          context.res = await onNotFound(context)
        }
        return context
      }

      let res!: Response
      let isError: boolean = false

      try {
        if (isPromise(handler)) {
          res = await handler(context, () => dispatch(i + 1))
        } else {
          res = handler(context, () => dispatch(i + 1))
        }
      } catch (err) {
        if (context instanceof HonoContext && onError) {
          if (err instanceof Error) {
            isError = true
            res = onError(err, context)
          }
        }
        if (!res) {
          throw err
        }
      }

      if (res && context instanceof HonoContext && (!context.finalized || isError)) {
        context.res = res
      }
      return context
    }
  }
}

function isPromise(p: Function) {
  if (typeof p === 'function' && p.constructor.name === 'AsyncFunction') {
    return true
  }
  return false
}
