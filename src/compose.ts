import { Context } from './context'

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <T>(middleware: Function[], onError?: Function) => {
  return function (context: T, next?: Function) {
    let index = -1
    return dispatch(0)
    async function dispatch(i: number): Promise<T> {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return context
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
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
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
