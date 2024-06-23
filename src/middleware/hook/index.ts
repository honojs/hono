import type { Context } from '../../context'
import type { Env, Handler, MiddlewareHandler, Next } from '../../types'

const isWrapped = Symbol()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Hook = (c: Context, handler: Handler, handlerContext: Record<string, any>) => void
export const hook = <E extends Env = Env>(
  options: {
    before?: Hook
    beforeNext?: Hook
    afterNext?: Hook
    after?: Hook
  } = {}
): MiddlewareHandler => {
  function hook(c: Context<E>, next: Next) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(c.req.matchResult[0] as unknown as [[any]][]).forEach((routeData) => {
      if (routeData[0][0][isWrapped]) {
        return
      }

      const handler = routeData[0][0]
      const name = handler.name || ''
      routeData[0][0] = {
        [name]: function (c: Context, next: Next) {
          const handlerContext = Object.create(null)

          if (options.before) {
            options.before?.(c, handler, handlerContext)
          }
          const internalNext = () => {
            options.beforeNext?.(c, handler, handlerContext)
            const res = next()
            res.finally(() => options.afterNext?.(c, handler, handlerContext))
            return res
          }
          const res = handler(c, internalNext)
          if (res instanceof Promise) {
            res.finally(() => options.after?.(c, handler, handlerContext))
          } else {
            options.after?.(c, handler, handlerContext)
          }
          return res
        },
      }[name]
      routeData[0][0][isWrapped] = true
    })
    return next()
  }
  hook[isWrapped] = true
  return hook
}
