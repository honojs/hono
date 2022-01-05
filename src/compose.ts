// Based on the code in the MIT licensed `koa-compose` package.
export const compose = (middleware: any) => {
  return function (context: any, next?: Function) {
    let index = -1
    return dispatch(0)
    function dispatch(i: number): any {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
