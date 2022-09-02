import { HonoContext } from './context.ts'
import type { NotFoundHandler } from './hono.ts'

interface ComposeContext {
  finalized: boolean
  res: any
}

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <C extends ComposeContext>(
  middleware: Function[],
  onNotFound?: NotFoundHandler
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

      if (!handler) {
        if (context instanceof HonoContext && context.finalized === false && onNotFound) {
          res = onNotFound(context)
        }
      } else {
        res = handler(context, async () => dispatch(i + 1))
      }

      if (!(res instanceof Promise)) {
        if (res && context.finalized === false) {
          context.res = res
        }
        return context
      } else {
        return res.then((res) => {
          if (res && context.finalized === false) {
            context.res = res
          }
          return context
        })
      }
    }
  }
}
