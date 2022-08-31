import { HonoContext } from './context.ts'
import type { NotFoundHandler } from './hono.ts'

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <C>(middleware: Function[], onNotFound?: NotFoundHandler) => {
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

      const tmp = handler(context, () => dispatch(i + 1))
      const res = tmp instanceof Promise ? await tmp : tmp

      if (res && context instanceof HonoContext && !context.finalized) {
        context.res = res
      }
      return context
    }
  }
}
