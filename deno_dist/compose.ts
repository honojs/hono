import { Context } from './context.ts'
import type { ParamIndexMap, Params } from './router.ts'
import type { Env, NotFoundHandler, ErrorHandler } from './types.ts'

interface ComposeContext {
  finalized: boolean
  res: unknown
}

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <C extends ComposeContext, E extends Env = Env>(
  middleware: [Function, ParamIndexMap | Params][],
  onError?: ErrorHandler<E>,
  onNotFound?: NotFoundHandler<E>
) => {
  return (context: C, next?: Function) => {
    let index = -1
    return dispatch(0)

    async function dispatch(i: number): Promise<C> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i

      let res
      let isError = false
      let handler

      if (middleware[i]) {
        handler = middleware[i][0]
        if (context instanceof Context) {
          context.req.setParams(middleware[i][1])
        }
      } else {
        handler = (i === middleware.length && next) || undefined
      }

      if (!handler) {
        if (context instanceof Context && context.finalized === false && onNotFound) {
          res = await onNotFound(context)
        }
      } else {
        try {
          res = await handler(context, () => {
            return dispatch(i + 1)
          })
        } catch (err) {
          if (err instanceof Error && context instanceof Context && onError) {
            context.error = err
            res = onError(err, context)
            isError = true
          } else {
            throw err
          }
        }
      }

      if (res !== undefined && 'response' in res) {
        res = res['response']
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res
      }
      return context
    }
  }
}
