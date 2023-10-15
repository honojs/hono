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

    function dispatch(i: number): C | Promise<C> {
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
          res = onNotFound(context)
        }
      } else {
        try {
          res = handler(context, () => {
            const dispatchRes = dispatch(i + 1)
            return dispatchRes instanceof Promise ? dispatchRes : Promise.resolve(dispatchRes)
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

      if (!(res instanceof Promise)) {
        if (res !== undefined && 'response' in res) {
          res = res['response']
        }
        if (res && (context.finalized === false || isError)) {
          context.res = res
        }
        return context
      } else {
        return res
          .then((res) => {
            if (res !== undefined && 'response' in res) {
              res = res['response']
            }
            if (res && context.finalized === false) {
              context.res = res
            }
            return context
          })
          .catch(async (err) => {
            if (err instanceof Error && context instanceof Context && onError) {
              context.error = err
              context.res = await onError(err, context)
              return context
            }
            throw err
          })
      }
    }
  }
}
