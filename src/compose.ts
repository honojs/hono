import { Context } from './context'

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <T>(middleware: Function[], onError?: Function) => {
  const errors: Error[] = []
  return function (context: T, next?: Function) {
    let index = -1
    return dispatch(0)
    async function dispatch(i: number): Promise<object | void> {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1))).catch((e) => {
          errors.push(e)
          if (onError && context instanceof Context) {
            context.res = onError(errors[0], context)
          } else {
            throw errors[0]
          }
        })
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
