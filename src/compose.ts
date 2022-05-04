import { Context } from '@/context'
import type { ErrorHandler } from '@/hono'

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <C>(middleware: Function[], onError?: ErrorHandler) => {
  return function (context: C, next?: Function) {
    let index = -1
    return dispatch(0)
    async function dispatch(i: number): Promise<C> {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      let handler = middleware[i]
      index = i
      if (i === middleware.length) handler = next
      if (!handler) return Promise.resolve(context)

      return Promise.resolve(handler(context, dispatch.bind(null, i + 1)))
        .then(() => {
          return context
        })
        .catch((err) => {
          if (onError && context instanceof Context) {
            context.res = onError(err, context)
            return context
          } else {
            throw err
          }
        })
    }
  }
}
