import type { ErrorHandler, NotFoundHandler } from './hono'

const defaultContextNext: Function = () => {}

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <C>(
  middleware: Function[],
  onError?: ErrorHandler,
  onNotFound?: NotFoundHandler
) => {
  let context: C
  let contextNext: Function = defaultContextNext
  let composed: () => void = async () => {
    if ((context as any).finalized === false && onNotFound) {
      ;(context as any).res = onNotFound(context as any) as any
      ;(context as any).finalized = true
    }
    return context
  }
  composed = ((prev) => async () => {
    const next = () => prev()

    try {
      const r = await contextNext(context, next)
      if (r) {
        ;(context as any).res = r
      }
    } catch (err) {
      if (onError) {
        ;(context as any).res = onError(err as Error, context as any)
      }
    }
  })(composed)

  for (let i = middleware.length - 1; i >= 0; i--) {
    const m = middleware[i]
    const prev = composed
    const next = () => prev()
    composed = async () => {
      try {
        const r = await m(context, next)
        if (r) {
          ;(context as any).res = r
        }
      } catch (err) {
        if (onError) {
          if (err instanceof Error) {
            ;(context as any).res = onError(err as Error, context as any)
          }
        } else {
          throw err
        }
      }
    }
  }

  return (_context: C, _next?: Function) => {
    context = _context
    contextNext = _next || defaultContextNext
    return composed()
  }
}
