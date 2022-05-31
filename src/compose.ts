import type { ErrorHandler, NotFoundHandler } from './hono'

const defaultContextNext: Function = () => {}

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <C>(
  middleware: Function[],
  onError: ErrorHandler = (err) => {
    throw err
  },
  onNotFound?: NotFoundHandler
) => {
  let context: C
  let contextNext: Function = defaultContextNext
  let composed: () => void = onNotFound
    ? async () => {
        if ((context as any).finalized === false) {
          ;(context as any).res = onNotFound(context as any) as any
        }
      }
    : async () => {}

  composed = ((prev) => async () => {
    const next = () => prev()

    try {
      const r = await contextNext(context, next)
      if (r) {
        ;(context as any).res = r
      }
    } catch (err) {
      if (err instanceof Error) {
        ;(context as any).res = onError(err, context as any)
      } else {
        throw err
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
        if (err instanceof Error) {
          ;(context as any).res = onError(err, context as any)
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
