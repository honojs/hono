import type { Context } from '../../context'
import type { Env, Handler, MiddlewareHandler, Next } from '../../types'

const isWrapped = Symbol()

export type Hook = (
  c: Context,
  handler: Handler,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlerContext: Record<string, any>,
  traceId: string
) => void
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
    c.set('middleware-hook-trace-id' as any, Math.random().toString(16).slice(2))

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
          const traceId = c.get('middleware-hook-trace-id')

          if (options.before) {
            options.before?.(c, handler, handlerContext, traceId)
          }
          const internalNext = () => {
            options.beforeNext?.(c, handler, handlerContext, traceId)
            const res = next()
            res.finally(() => options.afterNext?.(c, handler, handlerContext, traceId))
            return res
          }
          const res = handler(c, internalNext)
          if (res instanceof Promise) {
            res.finally(() => options.after?.(c, handler, handlerContext, traceId))
          } else {
            options.after?.(c, handler, handlerContext, traceId)
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
